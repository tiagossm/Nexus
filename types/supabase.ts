export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            events: {
                Row: {
                    id: string
                    title: string
                    duration: number
                    location: string
                    type: 'One-on-One' | 'Group'
                    active: boolean
                    color: string
                    url: string
                    description: string | null
                    created_at?: string
                }
                Insert: {
                    id: string
                    title: string
                    duration: number
                    location: string
                    type: 'One-on-One' | 'Group'
                    active: boolean
                    color: string
                    url: string
                    description?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    duration?: number
                    location?: string
                    type?: 'One-on-One' | 'Group'
                    active?: boolean
                    color?: string
                    url?: string
                    description?: string | null
                    created_at?: string
                }
            }
            bookings: {
                Row: {
                    id: string
                    event_id: string
                    client_name: string
                    client_email: string
                    start_time: string
                    end_time: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    event_id: string
                    client_name: string
                    client_email: string
                    start_time: string
                    end_time: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    event_id?: string
                    client_name?: string
                    client_email?: string
                    start_time?: string
                    end_time?: string
                    created_at?: string
                }
            }
            contacts: {
                Row: {
                    id: string
                    name: string
                    email: string
                    cpf: string | null
                    phone: string | null
                    age: number | null
                    status: 'Pendente' | 'Convidado' | 'Agendado'
                    last_invite_sent_at: string | null
                    invite_count: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    email: string
                    cpf?: string | null
                    phone?: string | null
                    age?: number | null
                    status?: 'Pendente' | 'Convidado' | 'Agendado'
                    last_invite_sent_at?: string | null
                    invite_count?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    cpf?: string | null
                    phone?: string | null
                    age?: number | null
                    status?: 'Pendente' | 'Convidado' | 'Agendado'
                    last_invite_sent_at?: string | null
                    invite_count?: number
                    created_at?: string
                }
            }
        }
    }
}
