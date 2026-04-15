
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ycibjtbrqmpatrmfsyye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaWJqdGJycW1wYXRybWZzeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDI1MjQsImV4cCI6MjA5MDM3ODUyNH0.yE8L0EE3Cp18PFxnt7JnmfHbOYlzt7cWXlf_lZWWIao'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: tables, error } = await supabase
    .from('admin_users')
    .select('*')
    .limit(1)

  if (error) {
    console.log('admin_users table error or does not exist:', error.message)
  } else {
    console.log('admin_users table exists')
  }

  const { data: proposals, error: propError } = await supabase
    .from('proposals')
    .select('*')
    .limit(1)

  if (propError) {
    console.log('proposals table error or does not exist:', propError.message)
  } else {
    console.log('proposals table exists')
    if (proposals.length > 0) {
        console.log('proposals columns:', Object.keys(proposals[0]))
    }
  }
}

check()
