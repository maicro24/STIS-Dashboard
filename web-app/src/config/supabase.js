import { createClient } from '@supabase/supabase-js'

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkgdrkddmzaxbrjwsozn.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZ2Rya2RkbXpheGJyandzb3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUyOTgsImV4cCI6MjA4NTY5MTI5OH0.98K37pUvGx81wxoU1EAfVxGNp-X7ElVWHPOmEaUpW04'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
})

// Auth helper functions
export const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'traffic_controller'
            }
        }
    })
    return { data, error }
}

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    return { data, error }
}

export const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
}

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// Database operations for traffic logs
export const insertTrafficLog = async (logData) => {
    const { data, error } = await supabase
        .from('traffic_logs')
        .insert([logData])
    return { data, error }
}

export const getTrafficLogs = async (limit = 100) => {
    const { data, error } = await supabase
        .from('traffic_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    return { data, error }
}

export const insertControllerAction = async (action) => {
    const { data, error } = await supabase
        .from('controller_actions')
        .insert([action])
    return { data, error }
}
