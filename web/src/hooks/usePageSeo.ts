import { useEffect } from "react";

type PageSeoOptions = {
  title: string;
  description: string;
  path?: string;
  robots?: string;
  keywords?: string;
  image?: string;
};

function upsertMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function upsertCanonical(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.rel = "canonical";
    document.head.appendChild(tag);
  }
  tag.href = href;
}

export function usePageSeo({ title, description, path = "/", robots, keywords, image }: PageSeoOptions) {
  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}${path}`;

    document.title = title;
    upsertMeta("description", description);
    if (keywords) upsertMeta("keywords", keywords);
    if (robots) upsertMeta("robots", robots);
    else upsertMeta("robots", "index, follow");

    const defaultImage = `${origin}/pwa-512x512.png`;
    const seoImage = image ? (image.startsWith('http') ? image : `${origin}${image}`) : defaultImage;

    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:url", url, "property");
    upsertMeta("og:site_name", "Knowhere", "property");
    upsertMeta("og:locale", "en_US", "property");
    upsertMeta("og:image", seoImage, "property");
    upsertMeta("og:image:width", "512", "property");
    upsertMeta("og:image:height", "512", "property");

    upsertMeta("twitter:card", "summary_large_image", "name");
    upsertMeta("twitter:site", "@knowhere", "name");
    upsertMeta("twitter:creator", "@knowhere", "name");
    upsertMeta("twitter:title", title, "name");
    upsertMeta("twitter:description", description, "name");
    upsertMeta("twitter:image", seoImage, "name");

    upsertCanonical(url);
  }, [title, description, path, robots, keywords, image]);
}
