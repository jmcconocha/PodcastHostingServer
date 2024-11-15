import express from 'express';
import RSS from 'rss';

const router = express.Router();

router.get('/', (req, res) => {
  const feed = new RSS({
    title: 'My Podcast',
    description: 'A self-hosted podcast feed',
    feed_url: `${req.protocol}://${req.get('host')}/feed`,
    site_url: `${req.protocol}://${req.get('host')}`,
    language: 'en',
    categories: ['Technology'],
  });

  req.db.all('SELECT * FROM episodes ORDER BY published_at DESC', [], (err, episodes) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    episodes.forEach(episode => {
      feed.item({
        title: episode.title,
        description: episode.description,
        url: episode.audio_url,
        guid: episode.id,
        date: episode.published_at,
        enclosure: {
          url: episode.audio_url,
          type: 'audio/mpeg'
        }
      });
    });

    res.type('application/xml');
    res.send(feed.xml());
  });
});

export default router;