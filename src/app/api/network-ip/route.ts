import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

export async function GET() {
  try {
    const nets = networkInterfaces();
    let bestIp: string | null = null;

    // Scan for non-internal IPv4 address
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          // Prefer Wi-Fi or Ethernet addresses over virtual adapters
          const lowerName = name.toLowerCase();
          if (lowerName.includes("wi-fi") || lowerName.includes("wlan") || lowerName.includes("eth")) {
            bestIp = net.address;
            break;
          }
          if (!bestIp && !lowerName.includes("vethernet") && !lowerName.includes("virtual")) {
            bestIp = net.address;
          }
        }
      }
      if (bestIp && (name.toLowerCase().includes("wi-fi") || name.toLowerCase().includes("eth"))) {
        break;
      }
    }

    // Fallback if virtual only
    if (!bestIp) {
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          if (net.family === "IPv4" && !net.internal) {
            bestIp = net.address;
            break;
          }
        }
        if (bestIp) break;
      }
    }

    return NextResponse.json({
      success: true,
      localIp: bestIp,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, localIp: null, error: String(error) },
      { status: 500 }
    );
  }
}
