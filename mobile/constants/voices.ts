export interface Voice {
  id: string;
  name: string;
  lang: string;
  gender?: 'female' | 'male';
}

export const VOICES: Voice[] = [
  { id: 'female-shaonv', name: 'Young Female', lang: 'en-US', gender: 'female' },
  { id: 'male-qn-qingse', name: 'Young Male', lang: 'en-US', gender: 'male' },
  { id: 'female-yujie', name: 'Professional Female', lang: 'en-US', gender: 'female' },
  { id: 'male-john', name: 'American Male', lang: 'en-US', gender: 'male' },
  { id: 'female-sunny', name: 'Sunny Female', lang: 'en-US', gender: 'female' },
  { id: 'male-david', name: 'Deep Male', lang: 'en-US', gender: 'male' },
  { id: 'female-emma', name: 'British Female', lang: 'en-GB', gender: 'female' },
  { id: 'male-will', name: 'British Male', lang: 'en-GB', gender: 'male' },
  { id: 'female-ash', name: 'Australian Female', lang: 'en-AU', gender: 'female' },
  { id: 'female-zira', name: 'Warm Female', lang: 'en-US', gender: 'female' },
  { id: 'male-guy', name: 'Friendly Male', lang: 'en-US', gender: 'male' },
  { id: 'female-susan', name: 'Calm Female', lang: 'en-US', gender: 'female' },
];
