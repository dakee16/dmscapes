import Link from "next/link";
import PostCover from "./PostCover";
import { shortDate, type PostSummary } from "./topics";
import css from "./Blog.module.css";

/** One guide on the /blog grid (and under "Keep reading"): cover, title, date and reading time. */
export default function PostCard({
  post,
  as: Heading = "h2",
}: {
  post: PostSummary;
  as?: "h2" | "h3";
}) {
  return (
    <Link href={`/blog/${post.slug}`} className={css.card}>
      <span className={css.cardCover}>
        <PostCover slug={post.slug} />
      </span>
      <Heading className={css.cardTitle}>{post.title}</Heading>
      <span className={css.cardMeta}>
        <time dateTime={post.date}>{shortDate(post.date)}</time> · {post.readingTimeMin} min
      </span>
    </Link>
  );
}
