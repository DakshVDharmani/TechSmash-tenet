const AboutPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-3xl text-center font-mono">
        <p className="text-primary text-lg mb-8">
          Nexora does not store your camera or microphone input. All monitoring is client-side unless explicitly connected to a backend service for social features. Your timeline data is yours. Anonymized deviation patterns may be used to improve the system's core alignment algorithms.
        </p>
        <p className="text-secondary text-sm">
          © NEXORA_SYSTEMS // CLASSIFIED
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
