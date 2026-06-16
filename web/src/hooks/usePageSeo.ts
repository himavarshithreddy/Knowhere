import { useEffect } from "react";

type PageSeoOptions = {
  title: string;
  description: string;
  path?: string;
  robots?: string;
  keywords?: string;
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

export function usePageSeo({ title, description, path = "/", robots, keywords }: PageSeoOptions) {
  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}${path}`;

    document.title = title;
    upsertMeta("description", description);
    if (keywords) upsertMeta("keywords", keywords);
    if (robots) upsertMeta("robots", robots);
    else upsertMeta("robots", "index, follow");

    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:url", url, "property");
    upsertMeta("og:site_name", "Knowhere", "property");

    upsertMeta("twitter:card", "summary_large_image", "name");
    upsertMeta("twitter:title", title, "name");
    upsertMeta("twitter:description", description, "name");

    upsertCanonical(url);
  }, [title, description, path, robots, keywords]);
}
