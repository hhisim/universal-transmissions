import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.UT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: Request) {
  try {
    // Check for session (authenticated member)
    const authHeader = request.headers.get('authorization');
    const anonymousId = request.headers.get('x-anonymous-id');
    
    let email: string | null = null;
    let plan = 'guest';

    if (authHeader) {
      const supabase = getSupabaseAdmin();
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!authError && user?.email) {
        email = user.email;
        // Get plan from profiles table
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('plan')
          .eq('email', email)
          .maybeSingle();
        plan = profile?.plan || 'free';
      }
    }

    if (!email && anonymousId) {
      // Guest user — check if permanently locked
      const { data: lock } = await supabaseAdmin
        .from('ut_guest_cymatic_locked')
        .select('anonymous_id')
        .eq('anonymous_id', anonymousId)
        .maybeSingle();
      
      if (lock) {
        return NextResponse.json({ 
          locked: true, 
          reason: 'Guest limit exceeded. Upgrade to Free or Paid for continued access.' 
        });
      }
    }

    // Fetch usage data for this user/anonymous_id
    const usageData: Record<string, any> = {};

    if (email) {
      // Authenticated member — fetch all tool usage
      const tables = ['ut_cymatic_usage', 'ut_audio_usage'];
      for (const table of tables) {
        const { data } = await supabaseAdmin
          .from(table as any)
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (data) {
          const toolId = table === 'ut_cymatic_usage' ? 'cymatic-tonoscope' : 'audio-mic';
          usageData[toolId] = data;
        }
      }
    }

    return NextResponse.json({
      email,
      plan,
      anonymousId: anonymousId || null,
      usage: usageData,
    });
  } catch (err) {
    console.error('Experience usage GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tool_id, action, anonymous_id } = await request.json();

    // Get auth from header
    const authHeader = request.headers.get('authorization');
    const supabase = getSupabaseAdmin();
    
    let email: string | null = null;
    let plan = 'guest';

    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user?.email) email = user.email;
    }

    // If no email, use anonymous_id
    const identifier = anonymous_id || 'anonymous';

    if (!email && anonymous_id) {
      // Check guest lock
      const { data: lock } = await supabaseAdmin
        .from('ut_guest_cymatic_locked')
        .select('anonymous_id')
        .eq('anonymous_id', anonymous_id)
        .maybeSingle();
      if (lock) {
        return NextResponse.json({ 
          allowed: false, 
          locked: true,
          message: 'Guest limit exceeded. Please create a free account or subscribe for unlimited access.'
        });
      }
    }

    // Record usage
    const table = tool_id === 'cymatic-tonoscope' || tool_id === 'cymatic-3d' 
      ? 'ut_cymatic_usage' 
      : 'ut_audio_usage';

    const column = action === 'snapshot' ? 'snapshots_used' 
                : action === 'video' ? 'videos_used' 
                : 'mic_uses';

    if (email) {
      // Upsert for authenticated user
      const { data: existing } = await supabaseAdmin
        .from(table as any)
        .select(column)
        .eq('email', email)
        .maybeSingle();

      const currentValue = existing ? (existing as any)[column] || 0 : 0;
      
      await supabaseAdmin
        .from(table as any)
        .upsert({
          email,
          [column]: currentValue + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });
    } else if (anonymous_id) {
      // Check against guest limits
      const limits = { snapshots_used: 1, videos_used: 0, mic_uses: 1 };
      const { data: existing } = await supabaseAdmin
        .from(table as any)
        .select('*')
        .eq('email', anonymous_id)
        .maybeSingle();

      const currentValue = existing ? (existing as any)[column] || 0 : 0;
      const limit = limits[column as keyof typeof limits] || 0;

      if (currentValue >= limit) {
        // Lock the guest permanently
        await supabaseAdmin
          .from('ut_guest_cymatic_locked')
          .upsert({ anonymous_id, locked_at: new Date().toISOString() }, { onConflict: 'anonymous_id' });
        
        return NextResponse.json({ 
          allowed: false, 
          locked: true,
          message: 'Guest limit reached. Create a free account to continue.'
        });
      }

      await supabaseAdmin
        .from(table as any)
        .upsert({
          email: anonymous_id, // stored in email column for guests
          [column]: currentValue + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });
    }

    return NextResponse.json({ allowed: true });
  } catch (err) {
    console.error('Experience usage POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
