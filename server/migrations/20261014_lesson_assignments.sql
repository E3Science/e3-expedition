-- Structured lesson assignments shown below the in-game presentation.
alter table public.lesson_records
  add column if not exists assignments jsonb not null default '[]'::jsonb
  check (jsonb_typeof(assignments) = 'array');

-- Starter assignments from the Science 101 section of the lesson overview.
-- Times are editable classroom estimates for the first prototype.
update public.lesson_records set assignments='[
  {"title":"Lab Safety with SpongeBob and Patrick","url":"https://drive.google.com/open?id=1yIgyGJAiSMq2UNboTelqk3FN4aLSJgnTxUpZqDG_gc4&usp=drive_copy","description":"Identify laboratory safety mistakes and explain the correct safety behavior.","durationMinutes":20},
  {"title":"So, I Had This Crazy Dream…","url":"https://docs.google.com/document/d/1cLrwxluOAcQ9Ll6t0kSTmAuRbKg_w7-czW9HVzNp_Wg/edit?usp=sharing","description":"Apply the lab safety rules to a short scenario.","durationMinutes":20}
]'::jsonb, updated_at=now() where lesson_code='0.1.3';

update public.lesson_records set assignments='[
  {"title":"Triple Beam Balance","url":"https://drive.google.com/open?id=1f1lEPiPaV5dfH6qL08hQcLalwZlJEsv2Eq0q6S8WfT0&usp=drive_copy","description":"Practice reading and using a triple beam balance.","durationMinutes":15},
  {"title":"Graduated Cylinder","url":"https://drive.google.com/open?id=1qzoWbH-B3NRZH5ZrcV1DneD2HodGdAWHELYx9NG5XYw&usp=drive_copy","description":"Practice measuring liquid volume with a graduated cylinder.","durationMinutes":15}
]'::jsonb, updated_at=now() where lesson_code='0.1.4A';

update public.lesson_records set assignments='[
  {"title":"Metric System","url":"https://drive.google.com/open?id=1SeLzQRzxFsBtN7ZPCQtGCy4vvD8I1BVu7Vy0H40ROYM&usp=drive_copy","description":"Review metric units and choose the appropriate measurement for each example.","durationMinutes":15}
]'::jsonb, updated_at=now() where lesson_code='0.1.4B';

update public.lesson_records set assignments='[
  {"title":"Writing a Procedure","url":"https://drive.google.com/open?id=1sBrqcp_-jld29evFR3Dh175msxkSepz5gEugSwXr8Cw&usp=drive_copy","description":"Write clear, repeatable steps for a scientific procedure.","durationMinutes":20},
  {"title":"Redi’s Experiment on Spontaneous Generation","url":"https://drive.google.com/open?id=1cLI-MocYEJXYdilCP156kERO5BkIr22iwhEFichfJNo&usp=drive_copy","description":"Analyze Redi’s experiment using scientific-method vocabulary.","durationMinutes":20}
]'::jsonb, updated_at=now() where lesson_code='0.1.5B';
