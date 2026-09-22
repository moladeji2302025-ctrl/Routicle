import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import RichText from '../components/RichText'
import NewsletterSignup from '../components/NewsletterSignup'

function fmt(d) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

/** One published post, at /blog/:slug. */
export default function BlogPostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    let live = true
    setPost(undefined)
    api
      .fetchBlogPost(slug)
      .then(({ post: p }) => live && setPost(p))
      .catch(() => live && setPost(null))
    return () => {
      live = false
    }
  }, [slug])

  useEffect(() => {
    if (!post) return undefined
    const previous = document.title
    document.title = `${post.title} · Routicle`
    return () => {
      document.title = previous
    }
  }, [post])

  if (post === undefined) return <div className="sp"><div className="sp-inner"><p className="explore-empty">Loading…</p></div></div>

  if (post === null) {
    return (
      <div className="sp">
        <header className="sp-hero">
          <h1 className="sp-title">Post not found</h1>
          <p className="sp-lede">It may have been unpublished or moved.</p>
          <div className="sp-actions sp-actions-center">
            <Link to="/blog" className="sp-btn sp-btn-primary">Back to the blog</Link>
          </div>
        </header>
      </div>
    )
  }

  return (
    <article className="sp blog-post">
      <div className="sp-inner">
        <Link to="/blog" className="blog-back">← All posts</Link>
        <header className="blog-post-head">
          <h1>{post.title}</h1>
          <p className="blog-post-meta">
            {post.authorName ? `${post.authorName} · ` : ''}
            {fmt(post.publishedAt)}
          </p>
          {post.excerpt && <p className="blog-post-lede">{post.excerpt}</p>}
        </header>
        {post.coverUrl && <img className="blog-post-cover" src={post.coverUrl} alt="" />}
        <RichText source={post.body} className="rich blog-post-body" />
        <div className="sp-signup">
          <NewsletterSignup variant="band" source="blog-post" />
        </div>
      </div>
    </article>
  )
}
