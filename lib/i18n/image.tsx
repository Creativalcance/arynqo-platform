"use client";
import Image, { type ImageProps } from "next/image";
import { useI18n } from "./client";
export default function LocalizedImage(props: ImageProps) { const { t } = useI18n(); return <Image {...props} alt={t(props.alt)} />; }
