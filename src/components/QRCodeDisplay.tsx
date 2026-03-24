"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  code: string;
}

export default function QRCodeDisplay({ code }: QRCodeDisplayProps) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/session/${code}`
      : "";

  return (
    <div className="flex flex-col items-center gap-6">
      {url && (
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <QRCodeSVG value={url} size={256} level="M" />
        </div>
      )}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-1">Code de la session</p>
        <p className="font-mono text-5xl font-bold tracking-[0.3em]">{code}</p>
      </div>
      <p className="text-sm text-gray-400">
        Scannez le QR code ou entrez le code sur{" "}
        <span className="font-medium text-gray-600">
          {typeof window !== "undefined" ? window.location.origin : ""}/join
        </span>
      </p>
    </div>
  );
}
