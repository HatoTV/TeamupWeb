// Byte-range answers (206) for static files: Workers static assets always answer 200 with the whole file and no
// Content-Length, and Safari does not play a video without 206 answers. The body is streamed and sliced chunk by
// chunk (no copy of the file in memory, little CPU); FixedLengthStream sets Content-Length.

/** Parses a single `bytes=` range against the file size: { start, end } (inclusive), 'invalid' or null (none). */
export function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return 'invalid';
  let start;
  let end;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    if (suffix === 0) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start > end || start >= size ? 'invalid' : { start, end };
}

/** Streams the bytes start..end (inclusive) of `body`, with a known length; stops reading after `end`. */
function sliceStream(body, start, end) {
  let offset = 0;
  const slicer = new TransformStream({
    transform(chunk, controller) {
      const chunkStart = offset;
      offset += chunk.byteLength;
      if (offset > start && chunkStart <= end) {
        controller.enqueue(chunk.subarray(Math.max(0, start - chunkStart), Math.min(chunk.byteLength, end + 1 - chunkStart)));
      }
      if (offset > end) controller.terminate();
    },
  });
  const { readable, writable } = new FixedLengthStream(end - start + 1);
  body.pipeThrough(slicer).pipeTo(writable).catch(() => {});
  return readable;
}

/**
 * Answers a video request from its full asset response (fetched with GET): 200 with Accept-Ranges, 206 for a valid
 * range, 416 otherwise. `size` comes from worker/asset-sizes.json (asset responses have no Content-Length).
 */
export function serveRange(request, response, size) {
  if (response.status !== 200 || !response.body || !(size > 0)) return response;

  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  const range = parseRange(request.headers.get('Range'), size);
  if (range === 'invalid') {
    response.body.cancel();
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  const { start, end } = range ?? { start: 0, end: size - 1 };
  const status = range ? 206 : 200;
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  if (request.method === 'HEAD') {
    response.body.cancel();
    headers.set('Content-Length', String(end - start + 1));
    return new Response(null, { status, headers });
  }
  return new Response(sliceStream(response.body, start, end), { status, headers });
}
