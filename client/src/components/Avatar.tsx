import type { CSSProperties } from "react";
import mooseImg from "@/assets/moose-portrait.webp";
import oliveImg from "@/assets/olive-dog.webp";
import foxImg from "@/assets/fox-cat.webp";
import type { ProfileId } from "@/api/client";

/** Per-player photo framing so both animals read at a matching size. */
const PET_IMG: Record<ProfileId, { src: string; scale: number; pos: string }> = {
  olive: { src: oliveImg, scale: 1.04, pos: "center 54%" },
  fox: { src: foxImg, scale: 1.12, pos: "44% 50%" },
};

/**
 * Moose — the professor black-Lab guide. Face-cropped at small sizes
 * (logo / coach), shown whole at hero sizes (>=96px, celebration).
 */
export function Moose({
  size = 120,
  celebrate = false,
  style = {},
}: {
  size?: number;
  celebrate?: boolean;
  style?: CSSProperties;
}) {
  const big = size >= 96;
  return (
    <img
      src={mooseImg}
      alt="Moose the Labrador"
      className={celebrate ? "float" : ""}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: big ? "contain" : "cover",
        objectPosition: big ? "center" : "center 18%",
        display: "block",
        ...style,
      }}
    />
  );
}

/**
 * Player avatar photo, framed to sit in a rounded-square `.avatar` tile.
 * Render inside an element with the `.avatar` class sized as desired.
 */
export function Avatar({
  player,
  style = {},
}: {
  player: ProfileId;
  style?: CSSProperties;
}) {
  const cfg = PET_IMG[player];
  return (
    <img
      src={cfg.src}
      alt={player === "olive" ? "Olive's dog" : "Fox's cat"}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: cfg.pos,
        display: "block",
        background: "#f4f0e7",
        transform: `scale(${cfg.scale})`,
        ...style,
      }}
    />
  );
}
