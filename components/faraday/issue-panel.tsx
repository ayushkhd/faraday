import type { CommentInput } from '@/lib/faraday/comment-input';

type Props = {
  input: CommentInput | null;
  url: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onUrlChange: (value: string) => void;
  onLoad: () => void;
  onUseFixture: () => void;
};

export function IssuePanel({ input, url, loading, error, disabled, onUrlChange, onLoad, onUseFixture }: Props) {
  const shortFingerprint = input ? `${input.fingerprint.slice(0, 8)}…${input.fingerprint.slice(-4)}` : 'pending';
  return (
    <section className="input-stage" aria-labelledby="input-title">
      <div className="input-heading">
        <div className="warning-mark" aria-hidden="true">!</div>
        <div>
          <p className="section-index">UNTRUSTED INPUT</p>
          <h1 id="input-title">GitHub issue comment</h1>
          <p>Paste a public issue-comment link. Faraday loads it without credentials and gives the same bounded text to both agents.</p>
        </div>
        <span className={`input-source ${input?.source || 'fixture'}`}>{input?.source === 'github' ? 'PUBLIC GITHUB' : 'DEMO FIXTURE'}</span>
      </div>

      <div className="comment-loader">
        <label htmlFor="comment-url">Public GitHub comment URL</label>
        <div>
          <input id="comment-url" type="url" value={url} disabled={disabled || loading} onChange={(event) => onUrlChange(event.target.value)} placeholder="https://github.com/owner/repo/issues/184#issuecomment-123456" autoComplete="off" spellCheck={false} />
          <button type="button" onClick={onLoad} disabled={disabled || loading || !url.trim()}>{loading ? 'Loading…' : 'Load comment'}</button>
        </div>
        {error ? <p className="input-error" role="alert">{error}</p> : <p className="input-help">Public comments only · 6 KiB maximum · no GitHub token used for loading</p>}
      </div>

      {input ? (
        <article className="comment-preview">
          <div className="comment-meta"><span>{input.repository}{input.issueNumber ? ` #${input.issueNumber}` : ''}</span><span>@{input.author}</span><span>INPUT MATCH · {shortFingerprint}</span></div>
          <p>{input.body}</p>
          <div className="comment-actions">
            {input.url ? <a href={input.url} target="_blank" rel="noreferrer">Open source comment ↗</a> : <span>Included demo-safe injection</span>}
            {input.source === 'github' ? <button type="button" onClick={onUseFixture} disabled={disabled}>Use included fixture</button> : null}
          </div>
        </article>
      ) : null}
    </section>
  );
}
