import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function AttentionMonitor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [blinkRate, setBlinkRate] = useState(0); // blinks/minute

  // simple blink detection variables
  let blinkCount = 0;
  let startTime = Date.now();
  let lastEAR = 0;

  // EAR helper (eye aspect ratio)
  function eyeAspectRatio(pts) {
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const p2 = dist(pts[1], pts[5]);
    const p3 = dist(pts[2], pts[4]);
    const p1 = dist(pts[0], pts[3]);
    return (p2 + p3) / (2.0 * p1);
  }

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length)
        return;

      const lm = results.multiFaceLandmarks[0];
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;

      // Landmark indices for left & right eye
      const LEFT_EYE = [33, 160, 158, 133, 153, 144];
      const RIGHT_EYE = [263, 387, 385, 362, 380, 373];

      const ptsL = LEFT_EYE.map((i) => [lm[i].x * w, lm[i].y * h]);
      const ptsR = RIGHT_EYE.map((i) => [lm[i].x * w, lm[i].y * h]);

      const ear =
        (eyeAspectRatio(ptsL) + eyeAspectRatio(ptsR)) / 2;

      // Detect blink: EAR dips below threshold
      if (ear < 0.22 && lastEAR >= 0.22) blinkCount++;
      lastEAR = ear;

      const elapsedMin = (Date.now() - startTime) / 60000;
      setBlinkRate(blinkCount / (elapsedMin || 1));

      // Draw landmarks to canvas (optional)
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(results.image, 0, 0, w, h);
      ctx.fillStyle = "lime";
      [...LEFT_EYE, ...RIGHT_EYE].forEach((i) => {
        const x = lm[i].x * w;
        const y = lm[i].y * h;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    camera.start();

    return () => camera.stop();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Opt-in camera view */}
      <video ref={videoRef} className="hidden" autoPlay playsInline />
      <canvas ref={canvasRef} width={640} height={480} />
      <p className="font-mono text-primary">
        Blink rate: {blinkRate.toFixed(1)} / min
      </p>
    </div>
  );
}
