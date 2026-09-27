"""Convert Blooket answer-key PDFs into E3 question JSON and idempotent SQL."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber


SOURCE_DIR = Path(r"C:\Users\morga\Downloads")
OUTPUT_JSON = Path("data/blooket_question_sets.json")
OUTPUT_SQL = Path("server/migrations/20260928_blooket_question_seed.sql")

SOURCES = [
    ("Science 101 _ Blooket.pdf", "Science 101", "All Chapters", 1),
    ("Geology of Mars Chapter 1 _ Blooket.pdf", "Geology of Mars", "Chapter 1", 5),
    ("Geology on Mars Chapter 2 _ Blooket.pdf", "Geology of Mars", "Chapter 2", 6),
    ("Geology of Mars Chapter 3 _ Blooket.pdf", "Geology of Mars", "Chapter 3", 7),
    ("Plate Motion Chapter 1 _ Blooket.pdf", "Plate Motion", "Chapter 1", 9),
    ("Plate Motion Chapter 2 _ Blooket.pdf", "Plate Motion", "Chapter 2", 10),
    ("Plate Motion Chapter 3 _ Blooket.pdf", "Plate Motion", "Chapter 3", 11),
    ("Rock Transformation Chapter 1 _ Blooket.pdf", "Rock Transformation", "Chapter 1", 14),
    ("Rock Transformation Chapter 2 _ Blooket.pdf", "Rock Transformation", "Chapter 2", 15),
    ("Rock Transformation Chapter 3 _ Blooket.pdf", "Rock Transformation", "Chapter 3", 16),
    ("Phase Change Chapter 1 _ Blooket.pdf", "Phase Change", "Chapter 1", 19),
    ("Phase Change Chapter 3 _ Blooket.pdf", "Phase Change", "Chapter 3", 21),
    ("Chemical Reactions_ Chapter 1 Review _ Blooket.pdf", "Chemical Reaction", "Chapter 1 Review", 24),
    ("Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf", "Chemical Reaction", "Chapter 1 - Periodic Table", 24),
    ("Chemical Reactions_ Chapter 2 Review _ Blooket.pdf", "Chemical Reaction", "Chapter 2 Review", 25),
    ("Chemical Reaction Chapter 3 _ Blooket.pdf", "Chemical Reaction", "Chapter 3", 26),
    ("Populations and Resources Chapter 1 _ Blooket.pdf", "Population & Resources", "Chapter 1", 29),
    ("Pop & Resources Ch2&3 _ Blooket.pdf", "Population & Resources", "Chapters 2 & 3", 30),
    ("Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf", "Matter & Energy in Ecosystems", "Chapter 1", 33),
    ("Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf", "Matter & Energy in Ecosystems", "Chapters 2 & 3", 34),
]

QUESTION_RE = re.compile(r"^(\d+)\.$")
ANSWER_RE = re.compile(r"^([abcd])\)$", re.I)
SKIPPED: list[dict] = []


def grouped_lines(words: list[dict], tolerance: float = 2.0) -> list[list[dict]]:
    lines: list[list[dict]] = []
    for word in sorted(words, key=lambda value: (value["top"], value["x0"])):
        if not lines or abs(lines[-1][0]["top"] - word["top"]) > tolerance:
            lines.append([word])
        else:
            lines[-1].append(word)
    return [sorted(line, key=lambda value: value["x0"]) for line in lines]


def join_words(words: list[dict]) -> str:
    if not words:
        return ""
    parts: list[str] = []
    previous = None
    for word in sorted(words, key=lambda value: (round(value["top"] / 2) * 2, value["x0"])):
        text = word["text"].strip()
        if not text or text in {"✓", "✔"}:
            continue
        if previous is not None and word["top"] - previous["top"] > 3:
            parts.append(" ")
        parts.append(text)
        previous = word
    text = re.sub(r"\s+", " ", " ".join(parts)).strip()
    repairs = {
        "by m simpler or easier to see": "by making it simpler or easier to see",
        "interaction between t __________": "interaction between the __________",
        "differen substances": "different substances",
        "population siz ____________": "population size will ____________",
        "attra between molecules": "attraction between molecules",
        "attract between molecules": "attraction between molecules",
        "pulled a each other": "pulled apart from each other",
        "Rocky Mountains and Great Plains Different in large-scale ways but have similar__ some rock formations.": "The Rocky Mountains and Great Plains are different in large-scale ways but have similar __________, such as some rock formations.",
    }
    for damaged, repaired in repairs.items():
        text = text.replace(damaged, repaired)
    return text


def parse_page(page, filename: str, page_number: int) -> list[dict]:
    words = page.extract_words(extra_attrs=["fontname"])
    question_markers = [
        word for word in words
        if word["x0"] < page.width * 0.22 and QUESTION_RE.match(word["text"])
    ]
    questions: list[dict] = []
    for marker_index, marker in enumerate(question_markers):
        block_bottom = question_markers[marker_index + 1]["top"] - 1 if marker_index + 1 < len(question_markers) else page.height - 18
        block = [word for word in words if marker["top"] - 2 <= word["top"] < block_bottom]
        answer_markers = [word for word in block if ANSWER_RE.match(word["text"])]
        if len(answer_markers) < 2:
            raise ValueError(f"{filename} page {page_number}, question {marker['text']}: found {len(answer_markers)} answers")
        first_answer_top = min(word["top"] for word in answer_markers)
        prompt_words = [
            word for word in block
            if word["top"] < first_answer_top - 2 and word is not marker
        ]
        prompt = join_words(prompt_words)
        has_image = any(
            image.get("bottom", 0) >= marker["top"] and image.get("top", page.height) < block_bottom
            for image in page.images
        )
        if has_image:
            SKIPPED.append({"sourceFile": filename, "sourcePage": page_number, "questionNumber": int(marker["text"][:-1]), "prompt": prompt, "reason": "Contains an image that the current archive question model cannot display"})
            continue
        answers: list[str] = []
        correct_index = None
        for letter in "abcd":
            answer_marker = next((word for word in answer_markers if word["text"].lower() == f"{letter})"), None)
            if not answer_marker:
                continue
            column_split = page.width * 0.45
            column_left = 0 if answer_marker["x0"] < column_split else column_split
            column_right = column_split if column_left == 0 else page.width
            next_in_column = min(
                (word["top"] for word in answer_markers if column_left <= word["x0"] < column_right and word["top"] > answer_marker["top"] + 2),
                default=block_bottom,
            )
            answer_words = [
                word for word in block
                if column_left <= word["x0"] < column_right
                and answer_marker["top"] - 2 <= word["top"] < next_in_column - 1
                and word is not answer_marker
            ]
            answer = join_words(answer_words)
            if not answer:
                SKIPPED.append({"sourceFile": filename, "sourcePage": page_number, "questionNumber": int(marker["text"][:-1]), "prompt": prompt, "reason": f"Answer {letter} is image-only or could not be extracted"})
                answers = []
                break
            answers.append(answer)
            if "Bold" in answer_marker.get("fontname", ""):
                correct_index = len(answers) - 1
        if not answers:
            continue
        if correct_index is None:
            raise ValueError(f"{filename} page {page_number}, question {marker['text']}: correct answer not detected")
        questions.append({
            "number": int(marker["text"][:-1]),
            "prompt": prompt,
            "answers": answers,
            "correctIndex": correct_index,
            "sourcePage": page_number,
        })
    return questions


def parse_pdf(path: Path) -> tuple[str, list[dict]]:
    with pdfplumber.open(path) as pdf:
        title = ""
        questions: list[dict] = []
        for page_number, page in enumerate(pdf.pages, 1):
            if page_number == 1:
                lines = grouped_lines(page.extract_words())
                for line in lines:
                    line_text = join_words(line)
                    if line_text.startswith("Blooket | Question Set - Answer Key"):
                        continue
                    if line and line[0]["top"] < 120 and "Name" not in line_text and "Date" not in line_text and "Class" not in line_text:
                        title = line_text
                        break
            questions.extend(parse_page(page, path.name, page_number))
    if not questions:
        raise ValueError(f"No questions extracted from {path.name}")
    return title or path.stem.replace(" _ Blooket", ""), questions


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(sets: list[dict]) -> str:
    lines = [
        "-- Blooket question seed generated from teacher-provided answer-key PDFs.",
        "-- Run after 20260927_learning_market_moderation.sql. Safe to run repeatedly.",
        "alter table public.study_questions add column if not exists source_key text;",
        "create unique index if not exists study_questions_source_key_key on public.study_questions(source_key) where source_key is not null;",
        "",
    ]
    for question_set in sets:
        unit = sql_literal(question_set["unitName"])
        chapter = sql_literal(question_set["chapterName"])
        position = question_set["missionPosition"]
        lines.extend([
            f"insert into public.question_sets(unit_name,chapter_name,mission_position,active) values({unit},{chapter},{position},true)",
            "on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;",
        ])
        for question in question_set["questions"]:
            prompt = sql_literal(question["prompt"])
            answers = sql_literal(json.dumps(question["answers"], ensure_ascii=False))
            correct = question["correctIndex"]
            source_key = sql_literal(f"blooket:{question_set['sourceFile']}:{question['number']}")
            lines.extend([
                "insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)",
                f"select sets.set_id,{prompt},{answers}::jsonb,{correct},true,{source_key} from public.question_sets sets",
                f"where sets.unit_name={unit} and sets.chapter_name={chapter}",
                f"on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;",
            ])
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    sets = []
    for filename, unit, chapter, mission_position in SOURCES:
        source_path = SOURCE_DIR / filename
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        source_title, questions = parse_pdf(source_path)
        sets.append({
            "sourceFile": filename,
            "sourceTitle": source_title,
            "unitName": unit,
            "chapterName": chapter,
            "missionPosition": mission_position,
            "questions": questions,
        })
        print(f"{filename}: {len(questions)} questions")
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps({"sets": sets, "skippedQuestions": SKIPPED}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    OUTPUT_SQL.write_text(build_sql(sets), encoding="utf-8")
    print(f"Total: {sum(len(entry['questions']) for entry in sets)} questions in {len(sets)} sets")
    print(f"Skipped for image/manual review: {len(SKIPPED)}")


if __name__ == "__main__":
    main()
