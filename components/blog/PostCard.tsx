import Link from "next/link";
import type { BlogPost } from "@/content/blog/types";
import { formatBlogDate } from "@/lib/blog";

/** One row on the /blog index: date and reading time, title, excerpt. */
export default function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-xl border border-ink/10 bg-card p-5 transition-colors hover:border-cobalt/40 sm:p-6"
    >
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
        <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
        <span aria-hidden="true">·</span>
        <span>{post.readingTimeMin} min read</span>
      </div>
      <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-cobalt sm:text-2xl">
        {post.title}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        {post.excerpt}
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cobalt">
        Read the guide
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
