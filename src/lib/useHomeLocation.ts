'use client'

import { useAuth } from '@/context/AuthContext'

export interface HomeLocation {
  lat: number
  lng: number
  address: string
  district: string
}

// The signed-in user's own home (profiles.home_*), used for distances and
// the "din bostad" marker. Null when signed out or not set yet — callers
// should then simply leave distance information out.
export function useHomeLocation(): HomeLocation | null {
  const { profile } = useAuth()
  if (!profile || profile.homeLat == null || profile.homeLng == null) return null
  return {
    lat: profile.homeLat,
    lng: profile.homeLng,
    address: profile.homeAddress ?? '',
    district: profile.homeDistrict ?? '',
  }
}
