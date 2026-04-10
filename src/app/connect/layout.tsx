import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect — The Tribe",
  description:
    "Join the Universal Transmissions collective — reach out to Hakan Hisim, request custom commissions, discuss symbolic art, or simply say hello.",
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
