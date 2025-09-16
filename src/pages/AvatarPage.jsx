import { useState } from "react";

const AvatarPage = () => {
  const [gender, setGender] = useState(null);
  const [details, setDetails] = useState({
    name: "",
    age: "",
    role: "",
  });
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  // Avatar options
  const avatars = {
    Male: ["/avatar1.png", "/avatar2.png"],
    Female: ["/avatar3.png", "/avatar4.png"],
  };

  const handleSaveDetails = () => {
    console.log("Saved details:", details);
    alert("Details saved!");
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-8 md:p-12 flex flex-col">
      {/* Header */}
      <h1 className="font-mono text-3xl text-primary mb-8 shrink-0">
        IDENTITY_CONFIGURATION
      </h1>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="lg:col-span-1 border border-secondary/50 p-6 flex flex-col">
          <h2 className="font-mono text-secondary mb-6">// PREVIEW</h2>

          {selectedAvatar ? (
            <div className="flex flex-col items-center">
              <img
                src={selectedAvatar}
                alt="Selected Avatar"
                className="w-40 h-40 object-cover border border-highlight"
              />
              <p className="mt-4 font-mono text-sm text-highlight">
                {gender} Avatar Selected
              </p>
            </div>
          ) : (
            <p className="font-mono text-secondary">No avatar selected</p>
          )}
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 border border-secondary/50 p-6 space-y-8 overflow-auto">
          {/* Step 1: Gender */}
          <div>
            <h3 className="font-mono text-secondary mb-4">// SELECT_GENDER</h3>
            <div className="flex gap-4">
              {["Male", "Female"].map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGender(g);
                    setSelectedAvatar(null);
                  }}
                  className={`px-6 py-3 border font-mono text-sm ${
                    gender === g
                      ? "border-highlight text-highlight"
                      : "border-secondary/50 text-secondary"
                  }`}
                >
                  {g.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: General Details */}
          {gender && (
            <div>
              <h3 className="font-mono text-secondary mb-4">
                // GENERAL_DETAILS
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={details.name}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, name: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-secondary/50 bg-transparent font-mono text-sm focus:border-highlight outline-none"
                />
                <input
                  type="number"
                  placeholder="Age"
                  value={details.age}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, age: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-secondary/50 bg-transparent font-mono text-sm focus:border-highlight outline-none"
                />
                <input
                  type="text"
                  placeholder="Role (e.g. Developer, Student)"
                  value={details.role}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, role: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-secondary/50 bg-transparent font-mono text-sm focus:border-highlight outline-none"
                />
                <button
                  onClick={handleSaveDetails}
                  className="px-6 py-2 border font-mono text-sm border-secondary/50 hover:border-highlight hover:text-highlight"
                >
                  [ SAVE_DETAILS ]
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Avatars */}
          {gender && (
            <div>
              <h3 className="font-mono text-secondary mb-4">// SELECT_AVATAR</h3>
              <div className="flex gap-6 flex-wrap">
                {avatars[gender].map((avatar, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`border ${
                      selectedAvatar === avatar
                        ? "border-highlight"
                        : "border-secondary/50"
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={`Avatar ${idx + 1}`}
                      className="w-32 h-32 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarPage;
