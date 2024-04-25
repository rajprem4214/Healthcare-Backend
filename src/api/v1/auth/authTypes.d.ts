declare interface UserDetails {
    fullName: string;
    email: string;
    role: 'patient' | 'practitioner' | 'related person',
    password: string;
    userId?: string;
    projectId?: string;
}

declare interface googleUserDetails {
    fullName: string,
    email: string,
    googleId: string,
    role: 'patient' | 'practitioner' | 'related person',
    userId?: string,
    projectId?: string
}