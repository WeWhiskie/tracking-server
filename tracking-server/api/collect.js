export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { data, session } = req.query;
    
    if (!data || !session) {
      throw new Error('Missing data');
    }

    // Store in Upstash Redis
    const redisResponse = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/lpush/${session}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([data])
      }
    );

    if (!redisResponse.ok) {
      throw new Error('Redis storage failed');
    }

    // Send to Zapier if we have the webhook
    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session,
          data,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {}); // Fail silently for Zapier
    }

  } catch (error) {
    // Fail silently - don't show errors to users
  }

  // Return 1x1 transparent pixel
  res.setHeader('Content-Type', 'image/gif');
  const pixel = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64');
  res.send(pixel);
}