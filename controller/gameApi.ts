export interface User {
    id:            number;
    username:      string;
    email:         string;
    password:      string;
    profile_image: string;
    role:          string;
    created_at:    Date;
    updated_at:    Date;
}
