/* global React */
// Player & guide art (uploaded illustrations). Scout = Moose, the guide.

// Olive & Fox use their photos; framed on a soft light tile so they pop on any theme.
const PET_IMG = {
  olive: { src: "assets/olive-dog.png", scale: 1.04, pos: "center 54%" },
  fox: { src: "assets/fox-cat.png", scale: 1.12, pos: "44% 50%" },
};

// Moose — the professor black-Lab guide (one illustration, framed by context).
function Scout({ pose = "idle", size = 120, style = {} }) {
  const big = size >= 96; // hero/celebration → show the whole standing professor
  return (
    <img
      src="assets/moose-portrait.png"
      alt="Moose the Labrador"
      className={pose === "celebrate" ? "float" : ""}
      width={size}
      height={size}
      style={{
        objectFit: big ? "contain" : "cover",
        objectPosition: big ? "center" : "center 18%",
        display: "block",
        ...style,
      }}
    />
  );
}

function Avatar({ player, pose = "happy", size = 120, style = {} }) {
  const id = typeof player === "string" ? player : (player && player.id);
  const cfg = PET_IMG[id];
  if (cfg) {
    return (
      <img
        src={cfg.src}
        alt={id === "olive" ? "Olive's dog" : "Fox's cat"}
        style={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: cfg.pos,
          display: "block", background: "#f4f0e7", transform: `scale(${cfg.scale})`, ...style,
        }}
      />
    );
  }
  return <Scout pose={pose} size={size} style={style} />;
}

Object.assign(window, { Scout, Moose: Scout, Avatar });
