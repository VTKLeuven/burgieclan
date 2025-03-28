import { notFound } from "next/navigation";

export default function CatchAllNotFound() {
    notFound(); // This will the custom not-found.tsx page
}