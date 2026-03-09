import { config } from "dotenv";
import type { NextConfig } from "next";

config({ path: "../../.env" });

const nextConfig: NextConfig = {
  transpilePackages: ["@axiom/shared"],
};

export default nextConfig;
