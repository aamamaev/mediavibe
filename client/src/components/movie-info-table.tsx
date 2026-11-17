import type { MovieWithRating } from "@shared/schema";

interface MovieInfoTableProps {
  movie: MovieWithRating;
}

interface InfoRow {
  label: string;
  value: string | null | undefined;
}

export function MovieInfoTable({ movie }: MovieInfoTableProps) {
  const aboutMovie: InfoRow[] = [
    { label: "Год производства", value: movie.year !== null && movie.year !== undefined ? String(movie.year) : "—" },
    { label: "Страна", value: movie.country },
    { label: "Жанр", value: movie.genres?.join(", ") },
    { label: "Возраст", value: movie.ageRating },
    { label: "Время", value: movie.durationText || (movie.runtime ? `${movie.runtime} мин` : null) },
  ];

  const crew: InfoRow[] = [
    { label: "Режиссёр", value: movie.director },
    { label: "Сценарий", value: movie.screenplay },
    { label: "Продюсер", value: movie.producer },
    { label: "Оператор", value: movie.cinematographer },
    { label: "Композитор", value: movie.composer },
    { label: "Художник", value: movie.artDirector },
    { label: "Монтаж", value: movie.editor },
  ];

  const boxOfficeInfo: InfoRow[] = [
    { label: "Бюджет", value: movie.budget },
    { label: "Сборы в мире", value: movie.boxOffice },
  ];

  const premieres: InfoRow[] = [
    { label: "Премьера в России", value: movie.premiereRussia },
    { label: "Премьера в мире", value: movie.premiereWorld },
  ];

  const hasAboutMovie = aboutMovie.some(row => row.value);
  const hasCrew = crew.some(row => row.value);
  const hasBoxOffice = boxOfficeInfo.some(row => row.value);
  const hasPremieres = premieres.some(row => row.value);

  return (
    <div className="space-y-6">
      {hasAboutMovie && (
        <InfoSection title="О фильме" rows={aboutMovie} />
      )}
      
      {hasCrew && (
        <InfoSection title="Съёмочная группа" rows={crew} />
      )}
      
      {hasBoxOffice && (
        <InfoSection title="Сборы" rows={boxOfficeInfo} />
      )}
      
      {hasPremieres && (
        <InfoSection title="Даты премьер" rows={premieres} />
      )}
    </div>
  );
}

interface InfoSectionProps {
  title: string;
  rows: InfoRow[];
}

function InfoSection({ title, rows }: InfoSectionProps) {
  const filteredRows = rows.filter(row => row.value);
  
  if (filteredRows.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-base mb-3" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {title}
      </h3>
      <div className="space-y-2">
        {filteredRows.map((row) => (
          <div key={row.label} className="flex gap-4" data-testid={`info-row-${row.label.toLowerCase().replace(/\s+/g, '-')}`}>
            <span className="text-muted-foreground min-w-[140px] flex-shrink-0 text-sm">
              {row.label}
            </span>
            <span className="text-sm">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
