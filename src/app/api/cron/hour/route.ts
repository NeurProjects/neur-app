import { processAction } from '@/server/actions/action';
import { dbGetActions } from '@/server/db/queries';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  // Hourly cron job
  // Get all Actions that are not completed or paused, and have a frequency of daily (86400 seconds)
  const actions = await dbGetActions({
    triggered: true,
    completed: false,
    paused: false,
    frequency: 3600,
  });

  console.log(`Processing ${actions.length} hourly actions`);

  for (const action of actions) {
    await processAction(action);
  }

  return Response.json({ success: true });
}
