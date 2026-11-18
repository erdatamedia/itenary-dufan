import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export type Warna = 'krem' | 'pink' | 'kuning' | 'mint' | 'langit' | 'lavender' | 'oranye'
const bg: Record<Warna, string> = {
  krem: 'bg-white', pink: 'bg-pink', kuning: 'bg-kuning', mint: 'bg-mint',
  langit: 'bg-langit', lavender: 'bg-lavender', oranye: 'bg-oranye',
}

export function Card({ warna = 'krem', className = '', children }: { warna?: Warna; className?: string; children: ReactNode }) {
  return <div className={`rounded-lg border-[3px] border-tinta p-3 shadow-brut ${bg[warna]} ${className}`}>{children}</div>
}

export function Btn({ warna = 'pink', kecil, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { warna?: Warna; kecil?: boolean }) {
  return (
    <button
      {...p}
      className={`rounded-lg border-[3px] border-tinta font-bold text-tinta transition-transform disabled:opacity-50 ${bg[warna]} ${
        kecil ? 'min-h-11 px-3 text-sm' : 'min-h-11 px-4'
      } shadow-brut active:translate-x-1 active:translate-y-1 active:shadow-none ${className}`}
    />
  )
}

export function Input({ className = '', ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`min-h-11 w-full rounded-lg border-[3px] border-tinta bg-white px-3 ${className}`} />
}

export function Badge({ warna, children }: { warna: Warna; children: ReactNode }) {
  return <span className={`inline-block rounded-md border-2 border-tinta px-2 text-sm font-bold ${bg[warna]}`}>{children}</span>
}

export function Judul({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-lg font-bold">{children}</h2>
}
