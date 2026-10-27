// The wheel picked in the header, read on the server from the cookie.
import { cookies } from 'next/headers'
import { WHEEL_COOKIE, wheelById, type Wheel } from '@/lib/wheels'

export interface WheelChoice {
  wheel: Wheel | null      // null: everything
  chosen: boolean          // false until the visitor has picked (even "everything")
}

export async function getWheel(): Promise<WheelChoice> {
  const value = (await cookies()).get(WHEEL_COOKIE)?.value ?? null
  return { wheel: wheelById(value), chosen: value === 'all' || !!wheelById(value) }
}
