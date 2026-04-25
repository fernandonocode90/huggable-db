WITH bsb_combined AS (
  SELECT d.id,
    string_agg(b.text, ' ' ORDER BY b.verse) AS bsb_text
  FROM public.daily_devotionals d
  JOIN public.bible_verses b
    ON b.translation = 'bsb'
   AND b.book_key = d.book_key
   AND b.chapter = d.chapter
   AND b.verse BETWEEN d.verse_start AND COALESCE(d.verse_end, d.verse_start)
  GROUP BY d.id
)
UPDATE public.daily_devotionals d
SET verse_text = c.bsb_text,
    translation = 'bsb',
    updated_at = now()
FROM bsb_combined c
WHERE d.id = c.id
  AND d.verse_text IS DISTINCT FROM c.bsb_text;