import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, ...params } = await req.json();
    
    switch (operation) {
      case 'invite-user':
        return await handleInviteUser(params);
      case 'exchange-token':
        return await handleExchangeToken(params);
      default:
        throw new Error('Invalid operation specified');
    }
  } catch (error) {
    console.error('Error in auth-operations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleInviteUser({ email }) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email);
  if (inviteError) throw inviteError;

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleExchangeToken({ code, userId }) {
  if (!code || !userId) {
    throw new Error('Code and userId are required');
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = "https://preview--raider.gptengineer.run/";

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    throw new Error(`Failed to exchange token: ${errorData}`);
  }

  const tokens = await tokenResponse.json();

  return new Response(
    JSON.stringify({ tokens }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}