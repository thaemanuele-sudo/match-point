"use client";
import { useParams } from "next/navigation";
import { VideoEsercizio } from "@/components/app/atletica/VideoEsercizio";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <VideoEsercizio id={id} />;
}
