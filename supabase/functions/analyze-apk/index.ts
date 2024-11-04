import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as zip from "https://deno.land/x/zip@v1.2.3/mod.ts";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";
import { AndroidManifestParser } from "npm:android-manifest-parser";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { filePath } = await req.json();
    
    console.log('Starting APK analysis for:', filePath);
    
    // Download the APK file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('apk_files')
      .download(filePath);

    if (downloadError) throw downloadError;

    // Convert to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Create a temporary directory for extraction
    const tempDir = await Deno.makeTempDir();
    
    try {
      // Extract APK (it's a ZIP file)
      const reader = new zip.ZipReader(new Uint8Array(arrayBuffer));
      const entries = await reader.entries();
      
      let manifestContent = null;
      const resources = [];
      const dexFiles = [];
      const libraries = [];
      const assets = [];
      
      console.log('Extracting APK contents...');

      for (const entry of entries) {
        if (entry.filename === "AndroidManifest.xml") {
          const content = await entry.getData();
          try {
            const parser = new AndroidManifestParser();
            const parsedManifest = await parser.parse(Buffer.from(content));
            console.log('Raw parsed manifest:', parsedManifest);
            
            // Transform the manifest structure to match our needs
            manifestContent = {
              package: parsedManifest.package,
              versionName: parsedManifest.versionName,
              versionCode: parsedManifest.versionCode,
              usesSdk: parsedManifest.usesSdk,
              permissions: parsedManifest.usesPermissions?.map(p => p.name) || [],
              activities: parsedManifest.application?.activities?.map(a => a.name) || [],
              services: parsedManifest.application?.services?.map(s => s.name) || [],
              receivers: parsedManifest.application?.receivers?.map(r => r.name) || []
            };
            
            console.log('Transformed manifest:', JSON.stringify(manifestContent, null, 2));
          } catch (e) {
            console.error('Error parsing manifest:', e);
            manifestContent = { error: 'Failed to parse manifest' };
          }
        } else if (entry.filename.endsWith(".dex")) {
          dexFiles.push(entry.filename);
        } else if (entry.filename.startsWith("lib/")) {
          libraries.push(entry.filename);
        } else if (entry.filename.startsWith("assets/")) {
          assets.push(entry.filename);
        } else if (entry.filename.startsWith("res/")) {
          resources.push(entry.filename);
        }
      }

      console.log('Updating database with extracted information...');

      // Update analysis record with proper null checks
      const { error: updateError } = await supabase
        .from('apk_analysis')
        .update({
          status: 'completed',
          package_name: manifestContent?.package || null,
          version_name: manifestContent?.versionName || null,
          version_code: manifestContent?.versionCode?.toString() || null,
          min_sdk_version: manifestContent?.usesSdk?.minSdkVersion?.toString() || null,
          target_sdk_version: manifestContent?.usesSdk?.targetSdkVersion?.toString() || null,
          permissions: manifestContent?.permissions || [],
          activities: manifestContent?.activities || [],
          services: manifestContent?.services || [],
          receivers: manifestContent?.receivers || [],
          manifest_content: {
            raw: manifestContent,
            resources,
            dexFiles,
            libraries,
            assets
          }
        })
        .eq('file_path', filePath);

      if (updateError) throw updateError;

      console.log('APK analysis completed successfully');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      // Cleanup
      await Deno.remove(tempDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});