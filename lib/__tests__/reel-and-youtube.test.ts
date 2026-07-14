import { describe, expect, it } from 'vitest';
import { toReelEmbedSrc, youtubeIdFromUrl, youtubeThumbnail } from '@/lib/reel-embed';
import { resolveQueryParam, formatCompactCount } from '@/lib/youtube-stats';

describe('toReelEmbedSrc', () => {
  it('should embed a YouTube Shorts URL when given a shorts link', () => {
    expect(toReelEmbedSrc('youtube', 'https://www.youtube.com/shorts/abc123DEF_-')).toBe(
      'https://www.youtube.com/embed/abc123DEF_-?autoplay=1',
    );
  });

  it('should embed a YouTube watch URL when given a full watch link', () => {
    expect(toReelEmbedSrc('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
    );
  });

  it('should embed a youtu.be short URL when given a shared link', () => {
    expect(toReelEmbedSrc('youtube', 'https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
    );
  });

  it('should return null when a YouTube URL has no parseable video id', () => {
    expect(toReelEmbedSrc('youtube', 'https://www.youtube.com/')).toBeNull();
  });

  it('should embed a TikTok video URL when given a full profile video link', () => {
    expect(
      toReelEmbedSrc('tiktok', 'https://www.tiktok.com/@scout2015/video/6718335390845095173'),
    ).toBe('https://www.tiktok.com/embed/v2/6718335390845095173');
  });

  it('should return null when a TikTok URL has no numeric id', () => {
    expect(toReelEmbedSrc('tiktok', 'https://www.tiktok.com/@scout2015')).toBeNull();
  });

  it('should route a Facebook URL through the video plugin with the href encoded', () => {
    const src = toReelEmbedSrc('facebook', 'https://www.facebook.com/watch/?v=1234567890');
    expect(src).toContain('https://www.facebook.com/plugins/video.php?href=');
    expect(src).toContain(encodeURIComponent('https://www.facebook.com/watch/?v=1234567890'));
  });

  it('should return null when the URL is blank', () => {
    expect(toReelEmbedSrc('youtube', '   ')).toBeNull();
  });
});

describe('youtubeIdFromUrl', () => {
  it('should extract the id from a watch URL', () => {
    expect(youtubeIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract the id from a youtu.be link with a tracking query', () => {
    expect(youtubeIdFromUrl('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
  });

  it('should extract the id from a shorts URL', () => {
    expect(youtubeIdFromUrl('https://www.youtube.com/shorts/abc123DEF_-')).toBe('abc123DEF_-');
  });

  it('should extract the id from a live URL', () => {
    expect(youtubeIdFromUrl('https://www.youtube.com/live/abc123DEF_-')).toBe('abc123DEF_-');
  });

  it('should return null for a non-YouTube URL', () => {
    expect(youtubeIdFromUrl('https://vimeo.com/12345')).toBeNull();
  });
});

describe('youtubeThumbnail', () => {
  it('should build a hqdefault thumbnail URL for a YouTube link', () => {
    expect(youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('should return null for a non-YouTube URL', () => {
    expect(youtubeThumbnail('https://vimeo.com/12345')).toBeNull();
  });
});

describe('resolveQueryParam', () => {
  it('should query by id when given a bare channel id', () => {
    expect(resolveQueryParam('UCX6OQ3DkcsbYNE6H8uQQuVA')).toEqual({
      key: 'id',
      value: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
    });
  });

  it('should query by id when given a /channel/ URL', () => {
    expect(resolveQueryParam('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA')).toEqual({
      key: 'id',
      value: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
    });
  });

  it('should query by handle when given a bare @handle', () => {
    expect(resolveQueryParam('@MrBeast')).toEqual({ key: 'forHandle', value: '@MrBeast' });
  });

  it('should query by handle and prefix @ when given a bare name', () => {
    expect(resolveQueryParam('MrBeast')).toEqual({ key: 'forHandle', value: '@MrBeast' });
  });

  it('should query by handle when given an @handle URL', () => {
    expect(resolveQueryParam('https://www.youtube.com/@MrBeast')).toEqual({
      key: 'forHandle',
      value: '@MrBeast',
    });
  });

  it('should query by username when given a legacy /user/ URL', () => {
    expect(resolveQueryParam('https://www.youtube.com/user/PewDiePie')).toEqual({
      key: 'forUsername',
      value: 'PewDiePie',
    });
  });
});

describe('formatCompactCount', () => {
  it('should abbreviate millions when given a large count', () => {
    expect(formatCompactCount(1_234_567)).toBe('1.2M');
  });

  it('should abbreviate thousands when given a mid-size count', () => {
    expect(formatCompactCount(12_300)).toBe('12.3K');
  });

  it('should render small numbers verbatim when under a thousand', () => {
    expect(formatCompactCount(742)).toBe('742');
  });
});
