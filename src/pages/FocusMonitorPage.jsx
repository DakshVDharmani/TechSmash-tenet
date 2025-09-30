import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  ObjectDetector,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function FocusMonitor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Metrics / state
  const [blinkRate, setBlinkRate] = useState(0); // blinks per minute
  const [attentionStatus, setAttentionStatus] = useState("Focused");
  const [isOnPhone, setIsOnPhone] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState("");

  // Internal refs to avoid re-renders
  const faceLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const rafIdRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const lastFocusedTimeRef = useRef(Date.now());
  const isAlertActiveRef = useRef(false);

  // Blink detection refs
  const blinkCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const lastBlinkLeftRef = useRef(0);
  const lastBlinkRightRef = useRef(0);

  const gazeEmaRef = useRef({ side: 0, up: 0, down: 0 });
  const lastBlinkTimeRef = useRef(0);
  const awaySinceRef = useRef(null);

  // Simple config knobs
  const THRESH = {
    blinkOn: 0.5,            // blendshape > this means blink
    gazeThreshold: 0.30,     // blendshape “lookXxx” threshold
    phoneScore: 0.5,         // cell phone detection score
  };

  // Gaze thresholds tuned to reduce false positives
const GAZE_THRESH = {
  side: 0.40,  // stronger than 0.30 to avoid normal micromovements
  up:   0.46,
  down: 0.43,
};

// Smoothing & debounce for stable UX
const SMOOTH = {
  alpha: 0.30,         // EMA smoothing factor (0..1); higher = snappier
  blinkGraceMs: 200,   // ignore gaze this long after a blink
  minAwayMs: 100,     // require "away" to be continuous for ≥1s to mark unfocused
};

  // Helper to get a named blendshape score
  const getBlendshapeScore = (categories, name) => {
    if (!categories) return 0;
    const found = categories.find((c) => c.categoryName === name);
    return found ? found.score : 0;
  };

  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    // Initialize audio for alert
    audioRef.current = new Audio(
      "https://www.soundjay.com/buttons/sounds/beep-01a.mp3" // Replace with a blaring bell sound URL if available
    );
    audioRef.current.loop = true;

    async function fetchCameraAccess() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data: settings, error } = await supabase
          .from('Settings')
          .select('camera_access')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (settings) {
          setCameraAccess(settings.camera_access ?? false);
        }
      } catch (err) {
        console.error('[FocusMonitor] Error fetching camera access:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCameraAccess();

    async function init() {
      if (!cameraAccess) return;

      try {
        // Load WASM files
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // Init models
        const faceLandmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            outputFaceBlendshapes: true,
            numFaces: 1,
          }
        );

        const objectDetector = await ObjectDetector.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/latest/efficientdet_lite0.tflite",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            scoreThreshold: 0.5,
          }
        );

        if (!mounted) {
          faceLandmarker.close();
          objectDetector.close();
          return;
        }

        faceLandmarkerRef.current = faceLandmarker;
        objectDetectorRef.current = objectDetector;

        // Get camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        await video.play();

        // Start render loop
        startLoop();
      } catch (err) {
        console.error("[FocusMonitor] init error:", err);
      }
    }

    function startLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      const drawingUtils = new DrawingUtils(ctx);

      const render = () => {
        rafIdRef.current = requestAnimationFrame(render);

        const faceLandmarker = faceLandmarkerRef.current;
        const objectDetector = objectDetectorRef.current;
        if (!faceLandmarker || !objectDetector) return;
        if (video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) return;

        // Resize canvas to video dims
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        if (canvas.width !== vw) canvas.width = vw;
        if (canvas.height !== vh) canvas.height = vh;

        const timestampMs = performance.now();

        const faceResults = faceLandmarker.detectForVideo(video, timestampMs);
        const objResults = objectDetector.detectForVideo(video, timestampMs);

        // Mirror the frame (draw video)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-vw, 0);
        ctx.drawImage(video, 0, 0, vw, vh);
        ctx.restore();

        // Default flags
        let hasPhone = false;
        let lookingAway = false;
        let lookingDown = false;

        // Draw phone detections
        if (objResults?.detections?.length) {
          objResults.detections.forEach((det) => {
            const cat = det.categories?.[0];
            if (!cat) return;
            if (
              cat.categoryName?.toLowerCase().includes("phone") &&
              (cat.score ?? 0) >= THRESH.phoneScore
            ) {
              hasPhone = true;
              const bbox = det.boundingBox;
              ctx.save();
              ctx.scale(-1, 1);
              ctx.translate(-vw, 0);
              ctx.strokeStyle = "yellow";
              ctx.lineWidth = 2;
              ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
              ctx.restore();
            }
          });
        }

        // Face landmarks + blendshapes
        if (faceResults?.faceLandmarks?.length) {

          const landmarks = faceResults.faceLandmarks[0];
          const categories = faceResults.faceBlendshapes?.[0]?.categories || [];
          // Blink detection (+ mark start time to gate gaze for a short window)
          const blinkLeft = getBlendshapeScore(categories, "eyeBlinkLeft");
          const blinkRight = getBlendshapeScore(categories, "eyeBlinkRight");

          let blinkStarted = false;
          if (blinkLeft > THRESH.blinkOn && lastBlinkLeftRef.current <= THRESH.blinkOn) {
            blinkCountRef.current += 1;
            blinkStarted = true;
          }
          if (blinkRight > THRESH.blinkOn && lastBlinkRightRef.current <= THRESH.blinkOn) {
            blinkCountRef.current += 1;
            blinkStarted = true;
          }
          if (blinkStarted) {
            lastBlinkTimeRef.current = Date.now();
          }

          lastBlinkLeftRef.current = blinkLeft;
          lastBlinkRightRef.current = blinkRight;

          const elapsedMin =
            (Date.now() - startTimeRef.current) / 60000 || 1 / 60_000;
          setBlinkRate(blinkCountRef.current / elapsedMin);


        // --- Gaze / head cues (smoothing + blink grace + hysteresis) ---
        const lookOutLeft  = getBlendshapeScore(categories, "eyeLookOutLeft");
        const lookOutRight = getBlendshapeScore(categories, "eyeLookOutRight");
        const lookInLeft   = getBlendshapeScore(categories, "eyeLookInLeft");
        const lookInRight  = getBlendshapeScore(categories, "eyeLookInRight");
        const lookUpLeft   = getBlendshapeScore(categories, "eyeLookUpLeft");
        const lookUpRight  = getBlendshapeScore(categories, "eyeLookUpRight");
        const lookDownLeft = getBlendshapeScore(categories, "eyeLookDownLeft");
        const lookDownRight= getBlendshapeScore(categories, "eyeLookDownRight");

        // optional extra tolerance when talking/smiling
        const jawOpen = getBlendshapeScore(categories, "jawOpen");
        const smile = Math.max(
          getBlendshapeScore(categories, "mouthSmileLeft"),
          getBlendshapeScore(categories, "mouthSmileRight")
        );
        const threshBoost = (jawOpen > 0.40 || smile > 0.40) ? 0.08 : 0.0;

        // Ignore gaze for a short time right after a blink
        const inBlinkGrace = (Date.now() - lastBlinkTimeRef.current) < SMOOTH.blinkGraceMs;
        const gatedSide = inBlinkGrace ? 0 : Math.max(lookOutLeft, lookOutRight, lookInLeft, lookInRight);
        const gatedUp   = inBlinkGrace ? 0 : Math.max(lookUpLeft, lookUpRight);
        const gatedDown = inBlinkGrace ? 0 : Math.max(lookDownLeft, lookDownRight);

        // EMA smoothing
        const ge = gazeEmaRef.current;
        ge.side = ge.side + SMOOTH.alpha * (gatedSide - ge.side);
        ge.up   = ge.up   + SMOOTH.alpha * (gatedUp   - ge.up);
        ge.down = ge.down + SMOOTH.alpha * (gatedDown - ge.down);

        const sideLook   = ge.side > (GAZE_THRESH.side + threshBoost);
        const upLook     = ge.up   > (GAZE_THRESH.up   + threshBoost);
        lookingDown      = ge.down > (GAZE_THRESH.down + threshBoost);

        const awayNow = sideLook || upLook || lookingDown;

        // Require sustained “away” for ≥1 s
        if (!awayNow) {
          awaySinceRef.current = null;
        } else if (awaySinceRef.current == null) {
          awaySinceRef.current = Date.now();
        }
        const awayCommitted =
          awaySinceRef.current != null &&
          (Date.now() - awaySinceRef.current) >= SMOOTH.minAwayMs;


          let status = "Focused";
          const phoneNow = hasPhone && lookingDown;
          setIsOnPhone(phoneNow);

          if (phoneNow)      status = "On phone";
          else if (awayCommitted) status = "Looking elsewhere";

          setAttentionStatus(status);


          // Handle unfocused alert
          if (status === "Focused") {
            lastFocusedTimeRef.current = Date.now();
            if (isAlertActiveRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setAlertMessage("");
              isAlertActiveRef.current = false;
            }
          } else {
            const unfocusedDuration = Date.now() - lastFocusedTimeRef.current;
            if (unfocusedDuration > 30000 && !isAlertActiveRef.current) { // 30 seconds
              isAlertActiveRef.current = true;
              audioRef.current.play().catch((err) => console.error("[FocusMonitor] Audio play error:", err));
              // Mock Ollama-generated alert message
              setAlertMessage(
                "Alert: Your focus has drifted for over 30 seconds. Please return your attention to the task at hand to optimize productivity."
              );
            }
          }

          // Draw face mesh
          const meshColor = status === "Focused" ? "#00ff88AA" : "#ff3344AA";
          const contourColor = status === "Focused" ? "#30FF30" : "#FF3030";

          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-vw, 0);

          const DU = drawingUtils;
          try {
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_TESSELATION,
              { color: meshColor, lineWidth: 0.5 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
              { color: contourColor, lineWidth: 1.2 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
              { color: contourColor, lineWidth: 1.2 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
              { color: contourColor, lineWidth: 1.0 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
              { color: contourColor, lineWidth: 1.0 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LIPS,
              { color: "#E0E0E0", lineWidth: 1.0 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
              { color: "#E0E0E0", lineWidth: 1.0 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
              { color: contourColor, lineWidth: 1.2 }
            );
            DU.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
              { color: contourColor, lineWidth: 1.2 }
            );
          } catch (e) {
            console.error("[FocusMonitor] Drawing error:", e);
          }

          ctx.restore();
        } else {
          // No face detected, treat as unfocused
          const unfocusedDuration = Date.now() - lastFocusedTimeRef.current;
          if (unfocusedDuration > 30000 && !isAlertActiveRef.current) {
            isAlertActiveRef.current = true;
            audioRef.current.play().catch((err) => console.error("[FocusMonitor] Audio play error:", err));
            setAlertMessage(
              "Alert: No face detected for over 30 seconds. Please return your attention to the task at hand."
            );
          }
        }
      };

      render();
    }

    if (cameraAccess) {
      init();
    }

    return () => {
      mounted = false;

      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Stop RAF
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      // Stop camera
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
      }

      // Close models
      const fl = faceLandmarkerRef.current;
      const od = objectDetectorRef.current;
      faceLandmarkerRef.current = null;
      objectDetectorRef.current = null;

      Promise.resolve()
        .then(() => fl && fl.close && fl.close())
        .then(() => od && od.close && od.close())
        .catch(() => {});
    };
  }, [cameraAccess, user]);

  if (loading) {
    return (
      <div className="min-h-[calc(95vh-4rem)] p-[clamp(16px,4vw,32px)] font-mono flex flex-col items-center">
        <h1
          className="text-primary mb-[2vh] self-start"
          style={{ fontSize: "clamp(20px,5vw,32px)" }}
        >
          FOCUS_MONITOR
        </h1>
        <p className="text-secondary" style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
          Loading settings...
        </p>
      </div>
    );
  }

  if (!cameraAccess) {
    return (
      <div className="min-h-[calc(95vh-4rem)] p-[clamp(16px,4vw,32px)] font-mono flex flex-col items-center">
        <h1
          className="text-primary mb-[2vh] self-start"
          style={{ fontSize: "clamp(20px,5vw,32px)" }}
        >
          FOCUS_MONITOR
        </h1>
        <p className="text-red-500" style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
          ⚠️ Camera Access disabled in settings
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(95vh-4rem)] p-[clamp(16px,4vw,32px)] font-mono flex flex-col items-center box-border">
      <h1
        className="text-primary mb-[2vh] self-start"
        style={{ fontSize: "clamp(20px,5vw,32px)" }}
      >
        FOCUS_MONITOR
      </h1>

      {/* Hidden video; we render to canvas */}
      <video ref={videoRef} className="hidden" autoPlay playsInline />

      {/* Mirrored view is drawn into the canvas */}
      <canvas
        ref={canvasRef}
        className="border border-secondary/40 max-w-full"
        style={{ width: "min(80vw, 640px)", height: "auto", maxHeight: "480px" }}
      />

      {alertMessage && (
        <div className="mt-4 p-4 border border-red-500 bg-red-500/10 w-full max-w-[80vw] text-center">
          <p className="text-red-500" style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
            {alertMessage}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-[80vw]">
        <div className="border border-secondary/50 p-4">
          <h2 className="text-secondary mb-2">// BLINKS</h2>
          <p className="text-primary">BLINK_RATE: {blinkRate.toFixed(1)}/min</p>
        </div>
        <div className="border border-secondary/50 p-4">
          <h2 className="text-secondary mb-2">// ATTENTION</h2>
          <p
            className={
              attentionStatus === "Focused"
                ? "text-primary"
                : "text-red-500"
            }
          >
            STATUS: {attentionStatus}
          </p>
        </div>
        <div className="border border-secondary/50 p-4">
          <h2 className="text-secondary mb-2">// PHONE</h2>
          <p className={isOnPhone ? "text-red-500" : "text-primary"}>
            PHONE_POSSIBLE: {isOnPhone ? "YES" : "NO"}
          </p>
        </div>
      </div>
    </div>
  );
}