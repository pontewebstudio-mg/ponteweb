const { supabase } = require('./supabase-memory');

async function main() {
  const { data, error } = await supabase.from('yt_knowledge').select('*').limit(1);
  if (error) {
    console.error('ERROR', error);
    process.exit(1);
  }
  console.log('OK', data);
}

main();
