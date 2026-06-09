export type Lang = 'en' | 'et';

export const LANGS: Lang[] = ['en', 'et'];
export const DEFAULT_LANG: Lang = 'en';

export const ui = {
  et: {
    title: 'Autonoomse laeva situatsiooniteadlikkuse arendamine masinnägemise abil',
    author: 'Tanel Treuberg',
    meta: 'TalTechi bakalaureusetöö · 2023',
    home: 'Avaleht',
    contents: 'Sisukord',
    references: 'Kasutatud kirjandus',
    readPdf: 'Loe PDF-ina',
    downloadPdf: 'Laadi alla PDF',
    prev: 'Eelmine',
    next: 'Järgmine',
    langName: 'Eesti',
    otherLang: 'English',
    abstract: 'Lühikokkuvõte',
    keywords: 'Märksõnad',
    backToContents: 'Tagasi sisukorda',
    chapter: 'Peatükk',
  },
  en: {
    title: 'Improving situational awareness of autonomous vessels using computer vision',
    author: 'Tanel Treuberg',
    meta: 'TalTech bachelor’s thesis · 2023',
    home: 'Home',
    contents: 'Contents',
    references: 'References',
    readPdf: 'Read as PDF',
    downloadPdf: 'Download PDF',
    prev: 'Previous',
    next: 'Next',
    langName: 'English',
    otherLang: 'Eesti',
    abstract: 'Abstract',
    keywords: 'Keywords',
    backToContents: 'Back to contents',
    chapter: 'Chapter',
  },
} satisfies Record<Lang, Record<string, string>>;

export const abstracts: Record<Lang, { body: string; keywords: string }> = {
  et: {
    body: 'Lõputöö eesmärgiks on arendada välja masinnägemise süsteem, mis sobib laeva käigukatsete automatiseeritud läbiviimiseks. See eeldab sobiva riistvara ja masinnägemise mudeli valikut, masinnägemise süsteemi tarkvara loomist, süsteemi katsetusi ning tulemuste analüüsi. Analüüsis võrreldakse erinevate mudelite täpsust ja kiirust. Samuti uuritakse välja, kuidas ning milliste meetoditega on võimalik optimeerida tarkvara nii, et võimalikult efektiivselt utiliseerida riistvara ning selle tulemusena ka tarkvara tööd sujuvamaks ning kiiremaks muuta.',
    keywords:
      'masinnägemine, tehisintellekt, sardsüsteem, manussüsteem, optimeerimine, konteinerdamine, virtuaalkeskkond, närvivõrk, masinõpe, riistvara kiirendus',
  },
  en: {
    body: 'The aim of the thesis is to develop a computer vision system suitable for automated vessel maneuvering tests. This involves selecting appropriate hardware and computer vision model, developing software for the computer vision system, conducting system tests, and analysing the results. The analysis compares the accuracy and speed of different computer vision models. Additionally, research is conducted to determine ways to optimize the software in order to efficiently utilize the hardware and thereby make the system run smoother and faster.',
    keywords:
      'computer vision, machine vision, embedded system, optimisation, containerisation, virtual environment, neural network, machine learning, hardware acceleration',
  },
};

export function isLang(x: string | undefined): x is Lang {
  return x === 'en' || x === 'et';
}

/** Prefix an internal path with the configured base (e.g. /seafarer/). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
