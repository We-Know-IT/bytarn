import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container-page py-20 sm:py-28">
      <title>Sidan finns inte — Hyresvägen</title>
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">Fel 404</p>
        <h1 className="display-lg">Sidan finns inte</h1>
        <p className="lead mx-auto mt-5 max-w-[460px]">
          Adressen kan vara felstavad, eller så har sidan eller annonsen tagits bort. Prova att börja om från startsidan
          eller leta bland bytesannonserna.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn btn-primary">
            Till startsidan
          </Link>
          <Link href="/annonser" className="btn btn-secondary">
            Hitta byte
          </Link>
        </div>
      </div>
    </div>
  )
}
