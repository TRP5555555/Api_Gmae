export interface User {
  id:            number;
  username:      string;
  email:         string;
  password:      string;
  profile_image: string;
  role:          string;
  wallet:        number;    
  created_at:    Date;
  updated_at:    Date;
}
