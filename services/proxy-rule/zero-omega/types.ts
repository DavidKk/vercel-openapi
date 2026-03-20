export interface Condition {
  conditionType: string
  pattern: string
}

export interface Rule {
  condition: Condition
  profileName: string
}

export interface Profile {
  rules?: Rule[]
}

export interface ZeroOmega {
  [profileName: string]: Profile
}
