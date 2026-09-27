-- Blooket question seed generated from teacher-provided answer-key PDFs.
-- Run after 20260927_learning_market_moderation.sql. Safe to run repeatedly.
alter table public.study_questions add column if not exists source_key text;
create unique index if not exists study_questions_source_key_key on public.study_questions(source_key) where source_key is not null;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Science 101','All Chapters',1,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Using the 5 senses to gather data: hear, smell, taste, touch, see','["Analyze", "Observations", "Research", "Opinions"]'::jsonb,1,true,'blooket:Science 101 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Something we ask to learn more about a topic or to figure something out.','["Hypothesis", "Question", "Observations", "Conclusion"]'::jsonb,1,true,'blooket:Science 101 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Looking up information to learn more about a topic to understand it better.','["Experiment", "Analyze", "Inferences", "Research"]'::jsonb,3,true,'blooket:Science 101 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Like a guess we make before we do an experiment to see if it''s true.','["Variable", "Research", "Hypothesis", "Question"]'::jsonb,2,true,'blooket:Science 101 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A test we do to find out if our guess is right or wrong.','["Scientific Argument", "Experiment", "Analyze", "Control"]'::jsonb,1,true,'blooket:Science 101 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Looking closely at the results of our experiment to understand what happened.','["Hypothesis", "Analyze", "Conclusion", "Research"]'::jsonb,1,true,'blooket:Science 101 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What we figure out after doing an experiment and looking at the results.','["Obseravtion", "Hypothesis", "Conclusion", "Analyze"]'::jsonb,2,true,'blooket:Science 101 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Something that can change in an experiment and affect the outcome.','["Conclusion", "Variable", "Hypothesis", "Question"]'::jsonb,1,true,'blooket:Science 101 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What we change on purpose in an experiment to see what will happen.','["Independent Variable", "Dependant Variable", "Hypothesis", "Control"]'::jsonb,0,true,'blooket:Science 101 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What we measure to see how it changes because of the independent variable.','["Dependant Variable", "Control", "Hypothesis", "Independent Variable"]'::jsonb,0,true,'blooket:Science 101 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What we keep the same in an experiment so only the independent variable affects outcome.','["Independent Variable", "Hypothesis", "Control", "Dependant Variable"]'::jsonb,2,true,'blooket:Science 101 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Information that describes something using words or descriptions.','["Quantitative", "Conclusion", "Qualitative", "Hypothesis"]'::jsonb,2,true,'blooket:Science 101 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Information that can be measured with numbers and amounts.','["Qualitative", "Quantitative", "Hypothesis", "Conclusion"]'::jsonb,1,true,'blooket:Science 101 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Interpretations made from observations and therefore they are linked to observati','["Inferences", "Hypothesis", "Conclusion", "Analysis"]'::jsonb,0,true,'blooket:Science 101 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientist use them to form conclusions','["Observations only", "Inferences and Observations", "Inferences only", "Neither Observations or Inferences"]'::jsonb,1,true,'blooket:Science 101 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The number of observations in an inference','["3", "1", "I or many", "4"]'::jsonb,2,true,'blooket:Science 101 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A descriptive statement that is backed up by evidence in the form of observations, experiments, and research','["Hypothesis", "Conclusion", "Opinion", "Fact"]'::jsonb,3,true,'blooket:Science 101 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A personal statement that reflects an individual person’s feelings and are not back evidence','["Opinion", "Hypothesis", "Conclusion", "Fact"]'::jsonb,0,true,'blooket:Science 101 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'An explanation of a phenomenon in nature that uses facts, not opinions','["Scientific Argument", "Hypothesis", "Experiment", "Conclusion"]'::jsonb,0,true,'blooket:Science 101 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Science 101' and sets.chapter_name='All Chapters'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Geology of Mars','Chapter 1',5,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A planet that can support life with liquid water and an energy source','["Habitable planet", "Goldilocks planet", "Active reading", "Biosphere"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Spheres (geosphere, atmosphere, hydrosphere, and biosphere) that make up rocky p','["Planetary globes", "Planetary landform", "Planetary spheres", "Jupiter, Saturn, Uranus, Neptune"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Event or series of events causing changes in the geosphere','["Landform", "Rocky planet", "Geologic process", "Reasoning"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Features on the surface of a planet formed by geologic processes','["Landforms", "Rocky planet", "Reasoning", "Geological process"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Information used to support or refute a claim','["data", "Reasoning", "Evidence", "opinions"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of explaining how evidence supports a claim','["Scientific argument", "Evidence", "Active reading", "Reasoning"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Arguments using claims, evidence, and reasoning','["Scientific arguments", "Geologic process", "Persuasive argument", "Active reading"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Grooves formed by flowing water or flowing lava','["Volcanoes", "Lakes", "Channels", "Craters"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Planets require 2 things to be habitable','["Oxygen & carbon dioxide", "Ice caps & liquid water", "Soil & fertilizers", "Energy source & liquid water"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Mixture of gases surrounding a planet','["Atmosphere", "Gas giant", "Air", "Geosphere"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'All living things on a planet','["Biosphere", "Cells", "System", "Population"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Long, narrow groove formed by flowing water, lava, or other liquid','["Channel", "Reasoning", "Rocky planet", "System"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Proposed answer to a question about the natural world','["Scientific argument", "Claim", "Reasoning", "Evidence"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Noticing similarities or differences between two or more things','["Claim", "Reasoning", "Comparison", "Models"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Solid part of a rocky planet','["Landforms", "Reasoning", "Hydrosphere", "Geosphere"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Liquid and solid water on a planet','["Hydrosphere", "Channels", "Landform", "Biosphere"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Feature on the surface of a planet','["Comparison", "Landform", "Rocky planet", "Habitable planet"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientist studying the geospheres of planets','["Scientific argument", "Scientific arguments", "Our Flowing water Model", "Planetary geologist"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of explaining how evidence supports a claim','["Our Flowing lava model", "Basalt", "Biosphere", "Reasoning"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Planet with a solid surface','["Models", "Comparison", "Habitable planet", "Rocky planet"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Claim supported by evidence','["Reasoning", "Rocky planet", "Scientific argument", "Comparison"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Set of interacting parts forming a complex whole','["Scientific arguments", "System", "Jupiter, Saturn, Uranus, Neptune", "Reasoning"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Interactive parts of a planetary system','["Core, mantle, crust", "Rivers, lakes, oceans", "Geosphere, atmosphere, hydrosphere, biosphere", "Earth, Moon, Sun"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rocky Planets','["Mercury, Venus, Earth, Mars", "Jupiter, Saturn, Uranus, Neptune", "Moons, asteroids, meteors", "All planets"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Gas giants','["Mercury, Venus, Earth, Mars", "Sun and all stars", "Atmosphere", "Jupiter, Saturn, Uranus, Neptune"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Rocky planets with similar landforms could have been made by th geological process','["TRUE", "FALSE"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 1 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Geology of Mars','Chapter 2',6,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a proposed answer to a question about the natural world','["Model", "Claim", "Reasoning", "Evidence"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'information about the natural world that is used to support or go against (refute) a','["Evidence", "Model", "Claim", "Reasoning"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'the process of making clear how your evidence supports your claim','["Claim", "Model", "Reasoning", "Evidence"]'::jsonb,2,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'an object, diagram, or computer program that helps us understand something by making it simpler or easier to see','["Model", "Landforms", "Flowing Water and Lava", "Triangle-shaped Landforms"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'thinking about one''s own understanding as one reads','["Extreme Reading", "Active Reading", "Passive Reading", "Reasoning"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'domed landforms on Venus thought to be created by melted rock rising up from und','["Novae", "Volcano", "Crater", "Channel"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'provide evidence about the past because they remain after the geologic processes t them stop happening','["Landforms", "Flowing Water Model", "Flowing Lava Model", "Models"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'used to test ideas and get evidence about processes in the natural world that are di observe','["Landforms", "Reasoning", "Geologic Process", "Models"]'::jsonb,3,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Models are exactly like the natural processes being investigated.','["FALSE", "TRUE"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'can create channels','["Meteors", "Flowing Water and Lava", "Earthquakes", "Models"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'formed by both flowing lava and flowing water on Earth','["Triangle-shaped Landforms", "Volcano", "Crater", "Novae"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'To go against a claim, such as with evidence','["Reverse", "Reasoning", "support", "Refute"]'::jsonb,3,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is adequate (enough) evidence needed for a scientific argument?','["4", "5", "3", "1"]'::jsonb,2,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Landforms can remain after a geologic process has stopped','["FALSE", "TRUE"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What provides evidence of past geologic processes?','["Satelite pictures", "Landforms", "Landers and rovers", "Water or Lava"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Geologic process that can create channels','["Flowing water and lava", "Models", "Meteors", "Earthquakes"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'mountain, channel, or sand dune are examples of...','["flowing water", "netflix movies", "landforms", "biosphere"]'::jsonb,2,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'An important part of a scientist''s job is to...','["ask questions", "start every sentence with \"By my calculations...\"", "clean beakers", "feed the mice"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: A scientific argument only needs a claim and evidence to support','["TRUE", "FALSE"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why did Gerya use a model to show how Novae are formed?','["to communicate his findings to his peers", "a momento of his investigation of venus", "He''s a computer scientist", "Novae formation is too difficult to observe"]'::jsonb,3,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: There is no evidence of a geological process after it has stopped','["TRUE", "FALSE"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'In the flowing lava model, a channel was created with _________ .','["water", "lava", "sand", "wax"]'::jsonb,3,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Dark matter makes up how much of the universe?','["80%", "2%", "unknown", "20%"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Dark matter is made up of subatomic particles called __________ .','["Axions", "Atoms", "Electrons", "Quarks"]'::jsonb,0,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: You too can be an astrophysicist!','["FALSE", "TRUE"]'::jsonb,1,true,'blooket:Geology on Mars Chapter 2 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Geology of Mars','Chapter 3',7,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A planet that can support life with liquid water and an energy source','["Habitable planet", "Goldilocks planet", "There are no habitable planets", "Biosphere"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Event or series of events causing changes in the geosphere','["Rocky planet", "Geologic process", "Reasoning", "Landform"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Features on the surface of a planet formed by geologic processes','["Geological process", "Reasoning", "Rocky planet", "Landforms"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Information used to support or refute a claim','["Reasoning", "Evidence", "opinions", "data"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of explaining how evidence supports a claim','["Reasoning", "Active reading", "Evidence", "Scientific argument"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Arguments using claims, evidence, and reasoning','["Geologic process", "Persuasive argument", "Scientific arguments", "Active reading"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Domed landforms on Venus created by melted rock rising up','["Mountain", "Volcano", "Geosphere", "Novae"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Grooves formed by flowing water or flowing lava','["Lakes", "Channels", "Volcanoes", "Craters"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Triangle-shaped landforms are formed by which geological processes?','["Flowing water and flowing air", "Meteor strikes and rain drops", "Tectonic plates movement", "Flowing water and flowing lava"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Formed by flowing water, rounding sediment pieces pressed and cemented into so','["Conglomerate", "Planetary spheres", "Scientific argument", "Mercury, Venus, Earth, Mars"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Formed by flowing lava, hardening into solid rock','["Cement", "Sedimentary rocks", "Basalt", "Crystals"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Planets require 2 things to be habitable','["Energy source & liquid water", "Oxygen & carbon dioxide", "Ice caps & liquid water", "Soil & fertilizers"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Proposed answer to a question about the natural world','["Claim", "Reasoning", "Scientific argument", "Evidence"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of explaining how evidence supports a claim','["Reasoning", "Biosphere", "Basalt", "Our Flowing lava model"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Planet with a solid surface','["Comparison", "Habitable planet", "Rocky planet", "Models"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Claim supported by evidence','["Reasoning", "Rocky planet", "Comparison", "Scientific argument"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Set of interacting parts forming a complex whole','["System", "Jupiter, Saturn, Uranus, Neptune", "Reasoning", "Scientific arguments"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rocky Planets','["Jupiter, Saturn, Uranus, Neptune", "All planets", "Moons, asteroids, meteors", "Mercury, Venus, Earth, Mars"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientists evaluate how convincing evidence is when they construct…','["Models", "Landforms", "Channels", "Arguments"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Both flowing lava and flowing water can form triangle-shaped la Earth.','["FALSE", "TRUE"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Conglomerate is formed by…','["Wind that deposits sand into dunes", "Flowing lava that cools into solid rock", "Flowing water that rounds, presses, and cements sediment into rock", "Ice that carves valleys into rock"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Basalt is formed when…','["Water freezes in cracks of rock", "Sediment is pressed and cemented together", "A mountain erodes into sand", "Lava cools and hardens into solid rock"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which rock type forms from sediments being compacted and cemented together?','["Lava", "Crystal", "Conglomerate", "Basalt"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Basalt forms from flowing water.','["TRUE", "FALSE"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which of the following can evidence do in a scientific argument?','["neither support not refute", "Go against (refute) a claim", "Support a claim", "Both support and refute"]'::jsonb,3,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: A convincing scientific argument must include both evidence and','["FALSE", "TRUE"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The process of making clear how your evidence supports your claim is called…','["Comparison", "Model", "Reasoning", "Analyse"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:27' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A proposed answer to a question about the natural world is a…','["Evidence", "Model", "Claim", "Reasoning"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:28' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The investigation of the channel on Mars took…','["A single scientist one year", "A computer model a few weeks", "A group of planetary geologists years to complete", "Only robots and satellites"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:29' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why do scientists think Mars may have been habitable in the past?','["It had oxygen and carbon dioxide", "It had soil and fertilizers", "It had liquid water and an energy source (the Sun)", "It had forests and oceans"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:30' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Using reasoning is important to make a scientific argument convin','["TRUE", "FALSE"]'::jsonb,0,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:31' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which of the following best describes the term "habitable"?','["Covered in oceans", "Always having forests", "Having the conditions necessary to support life", "Being made of rocks"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:32' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which of the following is the correct order for constructing a scientific argument?','["Reasoning Claim Evidence → →", "Claim → Evidence → Reasoning", "Evidence Claim Reasoning → →", "Reasoning Evidence Claim → →"]'::jsonb,1,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:33' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What''s the minimum number of sentences for a Scientific Argument?','["3-5", "no minimum", "8", "10"]'::jsonb,2,true,'blooket:Geology of Mars Chapter 3 _ Blooket.pdf:34' from public.question_sets sets
where sets.unit_name='Geology of Mars' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Plate Motion','Chapter 1',9,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Earth''s layer of hard, solid rock that is underneath the soil, vegetation, and water','["Mantle", "Core", "Stratosphere", "Outer layer"]'::jsonb,3,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientists who learn about Earth''s history by studying rocks and the fossils within t','["Earth''s outer layer", "Geologists", "Plate boundary", "Earthquake"]'::jsonb,1,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What are the sections of Earth''s outer layer called?','["Plate boundary", "United States", "Continents", "Plates"]'::jsonb,3,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The place where two plates meet','["Plate café", "Plate Border", "Plate boundary", "Collision zone"]'::jsonb,2,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A sudden shaking of Earth''s surface','["Earthquake", "Tremor", "Plateshake", "Hurricane"]'::jsonb,0,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A diagram that shows what the inside of something looks like','["Graph", "Cross section", "Plate boundary", "Model"]'::jsonb,1,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Something we observe to be similar over and over again','["Plate boundary", "Cross section", "Pattern", "Repitition"]'::jsonb,2,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Where Earth’s outer layer is made of hard, solid rock','["Under Icesheets at the Poles", "Under the Ocean", "Continents", "Everywhere"]'::jsonb,3,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Earthquakes cause the plates to move','["False", "True"]'::jsonb,0,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'TRUE or FALSE: Plate motion causes earthquakes','["True", "False"]'::jsonb,0,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'______________ are evidence of a plate boundary','["Neon green lines on the ground", "Purple line on the ground", "Earthquakes", "Think red line on the ground"]'::jsonb,2,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the outer layer of Earth made of?','["Liquid", "Gas", "Hard, solid rock", "Soil"]'::jsonb,2,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'How do geologist learn about Earth''s history?','["By looking at maps", "By studying the weather", "By studying rocks and fossils", "By observing animals"]'::jsonb,2,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens to the plates of Earth''s outer layer?','["They disappear", "They stay still", "They move", "They dissolve"]'::jsonb,2,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What evidence shows that Earth''s plates move?','["Earthquakes", "Fossil discovery", "Volcanic eruptions", "Mountain formation"]'::jsonb,0,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What does a cross section show?','["The outer layer only", "The inside of something", "The history of animals", "The weather"]'::jsonb,1,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What does a "pattern" refer to in geology?','["Something that is observed to be similar repeatedly", "A random occurrence", "A single event", "A unique finding"]'::jsonb,0,true,'blooket:Plate Motion Chapter 1 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Plate Motion','Chapter 2',10,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a soft solid layer below the upper layer that is super hot and where mantle convect','["Oceanic plate", "plate", "Mantle", "plate boundary"]'::jsonb,2,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Super-hot center of Earth, generates magnetic field made up of inner core and oute','["Mantle convection", "Asthenosphere", "Core", "Volcanic activity"]'::jsonb,2,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Plates move away from each other, new crust formed','["Transform Boundaries", "Mantle Convection", "Convergent Boundaries", "Divergent Boundaries"]'::jsonb,3,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Plates come together, subduction or mountain formation','["Transform Boundaries", "Mantle Convection", "Divergent Boundaries", "Convergent Boundaries"]'::jsonb,3,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'One plate goes under another, creates trenches, volcanoes, earthquakes','["Mantle Convection", "mid-ocean ridge", "Subduction", "Inner and Outer Core"]'::jsonb,2,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Landform at a divergent boundary','["Fault", "Mid-ocean ridge", "Mountains", "Trench"]'::jsonb,1,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'the slow, heat-driven movement semi-liquid rock beneath the Earth''s surface that d motion of tectonic plates.','["Subduction", "Mantle convection", "Divergent Boundary", "Convergent Boundary"]'::jsonb,1,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'forms where two plates pull away from each other','["Convergent Boundaries", "Divergent Boundary", "Subduction", "Mantle Convestion"]'::jsonb,1,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Earthquakes cause the plates to move','["False", "True"]'::jsonb,0,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Where do you find a trench?','["Mid-Ocean Ridge", "Divergent plate boundary", "Iceland", "Convergent plate boundary"]'::jsonb,3,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Where do you find a mid-ocean ridge?','["Convergent plate boundary", "Subduction zone", "Divergent plate boundary", "Mariana Trench"]'::jsonb,2,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Where do you find a Rift valley','["Subduction zone", "Himalayas", "At a divergent plate boundary", "At a convergent plate boundary"]'::jsonb,2,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'At which type of plate boundary does one plate sink into the mantle?','["Divergent", "Convergent", "Mid-ocean ridge", "Transform"]'::jsonb,1,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'the slow movement of hot, semi-liquid rock beneath the Earth''s surface that drive motion of tectonic plates.','["Core convection", "Core energy", "Mantle convection", "Mantle rotation"]'::jsonb,2,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'the super-hot center of our planet, made of iron and nickel, which generates the m field and influences geological activities.','["Mantle", "Lithosphere", "Asthenosphere", "Core"]'::jsonb,3,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The soft, squishy rock under the plates that allow tectonic plates to move around','["Asthenosphere", "Outer layer", "Lithosphere", "Core"]'::jsonb,0,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'the hard, rocky outer layer of the planet that includes the crust and upper part of t','["Lithosphere", "Mantle", "Core", "Asthenosphere"]'::jsonb,0,true,'blooket:Plate Motion Chapter 2 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Plate Motion','Chapter 3',11,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What technology is used to measure the movement of Earth''s plates?','["Sonar", "GPS technology", "Hydrophones", "Fossil evidence"]'::jsonb,1,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'By dividing the distance the plate travels by the time it took to move that distance.','["At what rate do the South American Plate and African Plate move apart?", "How can the rate at which one plate moves be calculated?", "Who developed the theory of continental movement?", "What is a hypothesis in scientific research?"]'::jsonb,1,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'By dividing the change in distance between points on those plates by the time it too points to move that distance.','["How can the rate at which one plate moves be calculated?", "What is the general speed of Earth''s plates as experienced by humans?", "At what rate do the South American Plate and African Plate move apart?", "How is the rate of movement between two plates calculated?"]'::jsonb,3,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Alfred Wegener','["At what rate do the South American Plate and African Plate move apart?", "Who developed the theory of continental movement?", "What is the general speed of Earth''s plates as experienced by humans?", "What is reasoning in the context of scientific practice?"]'::jsonb,1,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'An explanation for observable phenomena based on a body of evidence developed','["What is a theory in the context of science?", "What is the definition of ''rate'' in the context of geology?", "What is a hypothesis in scientific research?", "What is the general speed of Earth''s plates as experienced by humans?"]'::jsonb,0,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'An idea that may contribute important new knowledge for the evaluation of a scien','["What is a theory in the context of science?", "Who developed the theory of continental movement?", "What is reasoning in the context of scientific practice?", "What is a hypothesis in scientific research?"]'::jsonb,3,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Supercontinents, including Gondwanaland.','["What is reasoning in the context of scientific practice?", "What is the definition of ''rate'' in the context of geology?", "What were the continents connected into during Earth''s ancient past?", "How is the rate of movement between two plates calculated?"]'::jsonb,2,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'About 3 cm per year.','["Who developed the theory of continental movement?", "At what rate do the South American Plate and African Plate move apart?", "What technology is used to measure the movement of Earth''s plates?", "What is a theory in the context of science?"]'::jsonb,1,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The process of making clear how your evidence supports your claim.','["Who developed the theory of continental movement?", "What were the continents connected into during Earth''s ancient past?", "What is reasoning in the context of scientific practice?", "What is the definition of ''rate'' in the context of geology?"]'::jsonb,2,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Earth''s plates travel at a rate too slow to be experienced by humans.','["What is the general speed of Earth''s plates as experienced by humans?", "How can the rate at which one plate moves be calculated?", "At what rate do the South American Plate and African Plate move apart?", "What were the continents connected into during Earth''s ancient past?"]'::jsonb,0,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'How often or fast something happens.','["What is a theory in the context of science?", "What is the definition of ''rate'' in the context of geology?", "What were the continents connected into during Earth''s ancient past?", "What is a hypothesis in scientific research?"]'::jsonb,1,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'GPS stands for:','["Global Positioning System", "Geological Positioning Sensoring", "Geological Positioning System", "Global Preparation System"]'::jsonb,0,true,'blooket:Plate Motion Chapter 3 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Plate Motion' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Rock Transformation','Chapter 1',14,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of sediment being glued together','["compaction", "cementation", "rock formation", "weathering"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of sediment being buried and pressed together','["sediment", "compaction", "subduction", "cementation"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Diagram showing the internal structure of something','["energy", "compaction", "cementation", "cross section"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Ability to make things move or change','["magma", "metamorphic rock", "subduction", "energy"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Movement of sediment from one place to another, often caused by wind or flowing','["erosion", "igneous rock", "uplift", "cross section"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock type formed when magma cools and becomes solid','["rock formation", "metamorphic rock", "igneous rock", "sedimentary rock"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Hot liquid rock below the surface of Earth','["magma", "mineral", "rock material", "metamorphic rock"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Anything that has mass and takes up space','["matter", "mineral", "rock material", "magma"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock type formed when heat or pressure deep underground changes existing rock','["sedimentary rock", "cementation", "mineral", "metamorphic rock"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'One of the many different types of matter that make up rocks','["rock formation", "compaction", "plate", "mineral"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'One of the very large sections of hard, solid rock that make up Earth''s outer layer','["plate", "metamorphic rock", "cross section", "cementation"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Place where two plates meet','["sample", "rock formation", "subduction", "plate boundary"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Region of rock that formed together as a single rock type','["rock formation", "erosion", "cross section", "metamorphic rock"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Everything made of rock—magma, sediment, and all rock types','["energy", "rock materials", "cross section", "mineral"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Small part that is meant to show what the whole is like','["compaction", "metamorphic rock", "mineral", "sample"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Small pieces of rock','["rock material", "cross section", "sample", "sediment"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock type formed when sediment is pressed and glued together','["compaction", "rock materials", "subduction", "sedimentary rock"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process by which rock material moves under Earth''s outer layer and into the mant plate motion','["weathering", "subduction", "rock formation", "magma"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process by which all the rock formations of a region are pushed up due to plate mo','["matter", "uplift", "cementation", "sedimentary rock"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of rock breaking down into smaller pieces due to wind or moving water','["energy", "sediment", "sedimentary rock", "weathering"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Stronger evidence for distinguishing hand samples of rock.','["Number of observation", "Detailed observations", "Size of rock sample"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Provide information about the rock formation they came from.','["Igneous rock", "Rock formation", "Sedimentary rock", "Rock samples"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The Rocky Mountains and Great Plains are different in large-scale ways but have similar __________, such as some rock formations.','["sedimentary layers", "geological features", "rock cycles", "mineral compositions"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Formed by natural processes and were not always in their current form.','["Magma", "Sedimentary rock", "Igneous rock", "Rocks"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Use characteristics of hand samples to determine rock types.','["Climatologist", "Geologists", "Seismology", "Paleontologists"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock formation in the Rocky Mountains','["Igneous rock formed when magma cooled", "Sediment when rock was waethered", "Sedimentary rock when sediment was compacted and cementation", "Magma when rock melted"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock formation in the Great Plains','["Sedimentary rock when sediment was compacted and cementation", "Igneous rock formed when magma cooled", "Magma when rock melted", "Sediment when rock was waethered"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 1 _ Blooket.pdf:27' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Rock Transformation','Chapter 2',15,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of sediment being glued together','["cementation", "rock formation", "weathering", "compaction"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of sediment being buried and pressed together','["compaction", "subduction", "cementation", "sediment"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Diagram showing the internal structure of something','["energy", "cementation", "cross section", "compaction"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Ability to make things move or change','["energy", "metamorphic rock", "subduction", "magma"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Movement of sediment from one place to another, often caused by wind or flowing','["melting", "weathering", "erosion", "subduction"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock type formed when magma cools and becomes solid','["igneous rock", "rock formation", "sedimentary rock", "metamorphic rock"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Hot liquid rock below the surface of Earth','["rock material", "magma", "mineral", "metamorphic rock"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Anything that has mass and takes up space','["rock material", "mineral", "matter", "magma"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'One of the many different types of matter that make up rocks','["compaction", "mineral", "plate", "rock formation"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Region of rock that formed together as a single rock type','["metamorphic rock", "erosion", "rock formation", "cross section"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Everything made of rock—magma, sediment, and all rock types','["mineral", "energy", "cross section", "rock materials"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Small part that is meant to show what the whole is like','["sample", "metamorphic rock", "mineral", "compaction"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Small pieces of rock','["sediment", "sample", "cross section", "rock material"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock type formed when sediment is pressed and glued together','["sedimentary rock", "compaction", "subduction", "rock materials"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of rock breaking down into smaller pieces due to wind or moving water','["collision", "weathering", "sediment", "erosion"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Provide information about the rock formation they came from.','["Rock formation", "Igneous rock", "Sedimentary rock", "Rock samples"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock formation in the Rocky Mountains','["Sediment when rock was waethered", "Igneous rock formed when magma cooled", "Sedimentary rock when sediment was compacted and cementation", "Magma when rock melted"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock formation in the Great Plains','["Igneous rock formed when magma cooled", "Sediment when rock was waethered", "Magma when rock melted", "Sedimentary rock when sediment was compacted and cementation"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When matter is transformed by energy the matter _____________','["is the same and still present", "is different, but still present", "is destroyed", "becomes energy"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'weathering is a process driven by the energy from ___________','["weather", "wind", "the Sun", "Earth''s interior"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'melting rock is a process driven by _____________','["the Sun", "subduction", "magma", "Earth''s interior"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Sediment is formed when ___________ is weathered','["igneous rock", "sedimentary rock", "any rock", "wind and rain"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Magma is formed when _____________ is melted','["igneous rock", "melting", "sedimentary rock", "any rock"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Magma is formed when any rock is ____________','["eroded", "compacted", "weathered", "melted"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Sediment is formed when any rock is ____________','["eroded", "melted", "compacted", "weathered"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When sediment is compacted and cemented together:','["Sediment", "Sedimentary rock", "Magma", "Igneous rock"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When magma is cooled:','["Sediment", "Magma", "Igneous rock", "Sedimentary rock"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 2 _ Blooket.pdf:27' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 2'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Rock Transformation','Chapter 3',16,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of sediment being glued together','["cementation", "compaction", "weathering", "rock formation"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of sediment being buried and pressed together','["subduction", "cementation", "compaction", "sediment"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Diagram showing the internal structure of something','["energy", "cross section", "compaction", "cementation"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Ability to make things move or change','["magma", "energy", "metamorphic rock", "subduction"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Movement of sediment from one place to another, often caused by wind or flowing','["erosion", "cross section", "igneous rock", "uplift"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock type formed when magma cools and becomes solid','["rock formation", "sedimentary rock", "igneous rock", "metamorphic rock"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Hot liquid rock below the surface of Earth','["metamorphic rock", "mineral", "magma", "rock material"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Anything that has mass and takes up space','["rock material", "magma", "mineral", "matter"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'One of the many different types of matter that make up rocks','["compaction", "mineral", "plate", "rock formation"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Region of rock that formed together as a single rock type','["cross section", "rock formation", "erosion", "metamorphic rock"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Everything made of rock—magma, sediment, and all rock types','["mineral", "rock materials", "cross section", "energy"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Small part that is meant to show what the whole is like','["mineral", "metamorphic rock", "sample", "compaction"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Small pieces of rock','["sample", "rock material", "sediment", "cross section"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Rock type formed when sediment is pressed and glued together','["compaction", "sedimentary rock", "subduction", "rock materials"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process of rock breaking down into smaller pieces due to wind or moving water','["sediment", "sedimentary rock", "weathering", "energy"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Formation of the Rocky Mountains and Great Plains','["Formed at the same time then separated", "Great Plains then Rocky Mountains", "Formed at the same time in different locations", "Rocky Mountains then Great Plains"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When matter is transformed by energy the matter _____________','["is the same and still present", "is destroyed", "is different, but still present", "becomes energy"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'weathering is a process driven by the energy from ___________','["weather", "wind", "the Sun", "Earth''s interior"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'melting rock is a process driven by _____________','["subduction", "the Sun", "magma", "Earth''s interior"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Magma is formed when any rock is ____________','["weathered", "eroded", "melted", "compacted"]'::jsonb,2,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Sediment is formed when any rock is ____________','["melted", "weathered", "eroded", "compacted"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When sediment is compacted and cemented together:','["Sedimentary rock", "Sediment", "Magma", "Igneous rock"]'::jsonb,0,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When magma is cooled:','["Sedimentary rock", "Igneous rock", "Sediment", "Magma"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Subduction moves rock ___________','["using energy from the sun", "using wind or water", "up to Earth''s surface", "down into Earth''s interior"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Uplift moves rock ___________','["using energy from the sun", "up to Earth''s surface", "down into Earth''s interior", "using wind or water"]'::jsonb,1,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Any type of rock can transform into any type of rock because of ______________','["weathering", "subduction", "the Sun''s energy", "plate motion"]'::jsonb,3,true,'blooket:Rock Transformation Chapter 3 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Rock Transformation' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Phase Change','Chapter 1',19,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What are scientists saying could have happened to Lake Titan?','["Supernatural powers may have caused it to disappear.", "The life on the moon may have used the water as a resource.", "Their satellite images are not capturing accurate photos.", "It may have evaporated or froze."]'::jsonb,3,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the definition of phase?','["A comment or question towards text or a diagram.", "Evidence that refutes a claim.", "a noticeably different form of one substance.", "Tiny particles in an atom."]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'This phase of matter holds its shape and does not take the shape of its container.','["none of the above", "gas", "solid", "liquid"]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'This phase of matter flows and takes the shape of it''s container.','["gas", "liquid", "none of the above", "solid"]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What does "molecular scale" mean?','["Molecules move differently in each substance.", "Substances can NOT be seen with the human eye. They need an instrument to assist.", "Substances can be seen with the human eye.", "Molecules are very tiny so their weight is difficult to find."]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Describe molecular movement in a solid.','["Molecules fly freely with a lot of movement.", "Molecules are still with no movement.", "Molecules vibrate back and forth with little movement.", "Molecules flow while sticking close together with some movement."]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Describe molecular movement in a liquid.','["Molecules are still with no movement.", "Molecules vibrate back and forth with little movement.", "Molecules flow while sticking close together with some movement.", "Molecules fly freely with a lot of movement."]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Describe molecular movement in a gas.','["Molecules flow while sticking close together with some movement.", "Molecules vibrate back and forth with little movement.", "Molecules fly freely with a lot of movement.", "Molecules are still with no movement."]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What does "refute" mean in science?','["Scientific information provided by a real life scientist.", "to provide evidence that supports a claim.", "Evidence that is incorrect and/or made up.", "to provide evidence that goes against the claim"]'::jsonb,3,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which claim does our data and evidence support the most?','["Molecules reproduce and create multiple molecules the more phase changes they go through.", "Molecules move differently during different phase changes.", "Molecules change into a new kind of molecule during phase changes.", "The molecules in a substance disappear and no longer exist during phase changes."]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is an annotation?','["Discussions about articles, videos, and other educational presentations.", "Comments, notes, and questions added to text or a picture.", "Opinions of educated individuals involved in science.", "Evidence that supports a claim"]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens to molecules during a phase change?','["Molecules freedom of movement changes.", "Molecules die off and recreate.", "Molecules change shapes according to which phase change is occurring.", "Molecules grow and shrink in size."]'::jsonb,0,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Claim: Plants need water to remain living. Evidence: According to the article "Plan Us", the plants that received water on a regular basis survived the longest." Does this refute or support the claim?','["Refute", "Neither", "Support"]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Claim: Molecules no longer exist or disappear during phase changes. Evidence: Ac the Weird Water articles, "Water molecules stay the same, they just move differently. evidence refute or support the claim?','["Support", "Refute", "Neither"]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Claim: Absences from school can cause students to fall behind in learning. Evidenc According to Miss Frizzle''s class, students who have more absences score lower on th assessments. Does this evidence refute or support the claim?','["Neither", "Support", "Refute"]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When rain forms icicles on the roof, what happens to the molecules’ freedom of m','["Decreases", "Increases", "Stays the same"]'::jsonb,0,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When molecules have greater freedom of movement they are:','["Going through a chemical reaction", "Moving slower", "Moving faster"]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What type of phase change involves a solid transforming into a liquid?','["Melting", "Evaporation", "Boiling", "Condensation"]'::jsonb,0,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'In which phase do molecules have the most freedom of movement?','["Liquid", "Solid", "Gas", "''Murica"]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During the process of freezing, what happens to the arrangement of molecules?','["They start moving rapidly", "They remain the same", "They become more ordered", "They become less ordered"]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which phase change requires the absorption of energy?','["Freezing", "Condensation", "Melting"]'::jsonb,2,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the phase change when a liquid turns into a gas?','["Freezing", "Evaporation", "Condensation", "Melting"]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During the process of condensation, what happens to the energy of the molecules','["Energy is increasing", "Energy remains constant", "Energy is converted to light", "Energy is decreasing"]'::jsonb,3,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What type of phase change occurs when a gas transforms into a liquid?','["Melting", "Freezing", "Evaporation", "Condensation"]'::jsonb,3,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'In which phase do molecules have the least freedom of movement?','["Solid", "Gas", "Chairs", "Liquid"]'::jsonb,0,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the energy change during the process of freezing?','["Energy remains the same", "Energy decrease 2", "Energy increase", "E = mc"]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During the process of evaporation, what happens to the arrangement of molecules','["They become less ordered", "They remain the same", "They lose energy", "They become more ordered"]'::jsonb,0,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:27' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which phase change involves a decrease in molecular movement?','["Melting", "Boiling", "Evaporation", "Condensation"]'::jsonb,3,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:28' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During the process of melting, what happens to the energy of the molecules?','["Energy remains constant", "Energy decreases", "Energy is converted to potential energy", "Energy increases"]'::jsonb,3,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:29' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During the process of condensation, what happens to the arrangement of molecul','["They remain the same", "They become more ordered", "They gain potential energy", "They become less ordered"]'::jsonb,1,true,'blooket:Phase Change Chapter 1 _ Blooket.pdf:30' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Phase Change','Chapter 3',21,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Force pulling molecules together, limiting freedom of movement','["Molecular Attraction", "Liquid", "Kinetic Energy", "Energy Transfer"]'::jsonb,0,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Change in molecules'' freedom of movement, leading to macroscale appearance cha','["Weaker Molecular Attraction", "Phase Change", "Liquid", "Claim"]'::jsonb,1,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Energy of molecules in motion, determining phase changes','["Kinetic Energy", "Phase Change Determinants", "Claim", "Phase Change"]'::jsonb,0,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Average kinetic energy measure of substance''s molecules','["Gas", "Molecular Attraction", "Temperature", "Phase Change"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Interaction of kinetic energy and molecular attraction determines what?','["magnetism", "chemical reaction", "temperature", "Phase Change"]'::jsonb,3,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A pull between two molecules that is always the same for a substance','["magnetism", "phase change", "kinetic energy", "molecular attraction"]'::jsonb,3,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'the energy an object has due to its motion','["potential energy", "molecular attraction", "kinetic energy", "temperature"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When kinetic energy is greater than molecular attraction, molecules will _________','["pull apart", "move around", "change", "go together"]'::jsonb,0,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The molecular attraction for a substance __________','["never changes", "decrease with kinetic energy", "is different for each phase", "increases with kinetic energy"]'::jsonb,0,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When a substance has a _______attraction it is difficult for molecules to be pulled together','["molecular", "weak", "strong", "weaker or stronger"]'::jsonb,1,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When a substance has a ______ attraction it is difficult for molecules to be pulled apart from each other','["stronger", "molecular", "weaker or stronger", "weaker"]'::jsonb,0,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A phase change occurs when the kinetic energy _________ to overcome the attraction between molecules.','["comes to an equilibrium", "is removed", "increases", "decreases"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A phase change occurs when the kinetic energy _________ enough so that the attraction between molecules pulls them together','["increases", "stabilizes", "apart", "decrease"]'::jsonb,3,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Different substances can have ______________ molecular attraction','["weak", "weaker or stronger", "strong", "the same"]'::jsonb,1,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Whether or not a phase change occurs is determined by the interaction between the __________','["weaker or stronger attractions", "kinetic energy and potential energy", "kinetic energy and molecular attraction", "molecules"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'When molecular attraction is greater than kinetic energy, molecules will _________','["move around", "change", "go together", "pull apart"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What determines whether a phase change occurs?','["The number of molecules in a substance", "The type of container the substance is in", "The amount of space between molecules", "The interaction between kinetic energy and molecular attraction"]'::jsonb,3,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens when kinetic energy increases enough to overcome molecular attra','["The molecular attraction weakens permanently", "The molecules stop moving", "A phase change occurs", "The substance becomes colder"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which of the following statements is true about molecular attraction?','["It increases as temperature increases", "It depends on the number of molecules present", "It is always the same for a given substance", "It changes during a phase change"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the definition of kinetic energy?','["The amount of space between molecules", "A measure of how hot or cold something is", "The energy an object has because it is moving", "A pull between two molecules in a substance"]'::jsonb,2,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which of the following describes what happens when kinetic energy decreases?','["The substance turns into a gas", "The molecules move faster and spread apart", "The molecular attraction weakens", "The molecular attraction pulls molecules together, possibly causing a phase change"]'::jsonb,3,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which statement is true about different substances?','["The molecular attraction of a substance can change over time", "Some substances have stronger molecular attraction than others", "All substances have the same molecular attraction", "Different substances have the same kinetic energy at all temperatures"]'::jsonb,1,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:27' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Temperature is best defined as:','["The amount of space between molecules", "A measure of how hot or cold something is", "The force that pulls molecules together", "The energy an object has because it is moving"]'::jsonb,1,true,'blooket:Phase Change Chapter 3 _ Blooket.pdf:28' from public.question_sets sets
where sets.unit_name='Phase Change' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Chemical Reaction','Chapter 1 Review',24,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Tiny pieces that all matter is made of','["Cells", "Mass", "Matter", "Atoms"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Object, diagram, or program simplifying understanding','["Map", "Molecules", "Extended Structures", "Model"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Observable characteristic of a substance','["Atoms", "Science theories", "Property", "extended structures"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Relative size of things','["Property", "Siblings", "Molecules", "Scale"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Material made of the same atoms or group of atoms','["Molecule", "Atoms", "Substance", "Conglomerate"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Different substances have ___________________.','["different properties", "Molecules", "Models", "colors"]'::jsonb,0,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Things that are too small (or too large) to see can be studied with _______________.','["extended structures", "experiments", "a microscope", "models"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Substances have different properties because they are made of different _____________________________.','["extended structures", "particles", "atoms", "groups of atoms"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Groups of atoms repeat to make up a _______________________.','["molecules", "the periodic table", "substance", "matter"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Chemists observe substances in order to identify their __________________.','["molecules", "model", "properties", "science theories"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'NOT an examples of the methods and tools we used.','["Used models of the atoms", "Tested samples", "Make observations of samples", "Collected samples from multiple sources"]'::jsonb,1,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'More detailed observations provide ____________________________','["theories", "a model", "stronger evidence", "more evidence"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientists can use ____________________ to help them distinguish between different substances','["atoms", "variety of methods and tools", "a microscope", "properties"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Substances are made entirely of ____________________ .','["detailed observations", "models", "extended structures", "atoms"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Atoms are extremely small; ______________________ .','["they are not visible to the eye", "they are visible to the eye", "they are only visible in very large molecules", "they are made up of molecules"]'::jsonb,0,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Based on a body of evidence developed over time','["Models", "Claims", "Atoms", "Science theories"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientific theory vs other theories','["Scientific theories cannot change", "Scientists only make scientific theories", "Scientific theory is stronger because their backed by evidence", "Are the same"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The atoms that make up matter are organized in repeating groups that form __________________________________ .','["models", "science theories", "individual molecules or larger extended structures", "only extended structures"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Repeating atom groups link together to form large networks','["Properties", "models", "a molecule", "extended structures"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 1 Review _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Chemical Reaction','Chapter 1 - Periodic Table',24,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Tiny pieces that all matter is made of','["Matter", "Cells", "Atoms", "Mass"]'::jsonb,2,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Object, diagram, or program simplifying understanding','["Molecules", "Model", "Extended Structures", "Map"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Observable characteristic of a substance','["Atoms", "Property", "Science theories", "extended structures"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Relative size of things','["Scale", "Property", "Siblings", "Molecules"]'::jsonb,0,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Material made of the same atoms or group of atoms','["Molecule", "Atoms", "Conglomerate", "Substance"]'::jsonb,3,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Different substances have ___________________.','["colors", "different properties", "Molecules", "Models"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Things that are too small (or too large) to see can be studied with _______________.','["models", "extended structures", "experiments", "a microscope"]'::jsonb,0,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Substances have different properties because they are made of different _____________________________.','["atoms", "extended structures", "groups of atoms", "particles"]'::jsonb,0,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Groups of atoms repeat to make up a _______________________.','["substance", "matter", "the periodic table", "molecules"]'::jsonb,0,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Chemists observe substances in order to identify their __________________.','["molecules", "science theories", "properties", "model"]'::jsonb,2,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'NOT an examples of the methods and tools we used.','["Collected samples from multiple sources", "Make observations of samples", "Used models of the atoms", "Tested samples"]'::jsonb,3,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'More detailed observations provide ____________________________','["theories", "more evidence", "a model", "stronger evidence"]'::jsonb,3,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientists can use ____________________ to help them distinguish between different substances','["variety of methods and tools", "properties", "atoms", "a microscope"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Substances are made entirely of ____________________ .','["models", "detailed observations", "extended structures", "atoms"]'::jsonb,3,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Atoms are extremely small; ______________________ .','["they are made up of molecules", "they are only visible in very large molecules", "they are visible to the eye", "they are not visible to the eye"]'::jsonb,3,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Based on a body of evidence developed over time','["Atoms", "Claims", "Models", "Science theories"]'::jsonb,3,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientific theory vs other theories','["Scientific theories cannot change", "Scientists only make scientific theories", "Are the same", "Scientific theory is stronger because their backed by evidence"]'::jsonb,3,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The atoms that make up matter are organized in repeating groups that form __________________________________ .','["models", "individual molecules or larger extended structures", "only extended structures", "science theories"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Repeating atom groups link together to form large networks','["models", "extended structures", "a molecule", "Properties"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The center part of the periodic table (groups 3-12) is known as the ______________','["Nonmetals", "Transition Metals"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Elements in the same _____________ have similar properties','["period", "group"]'::jsonb,1,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:34' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Less reactive than the alkali metals, and are not found alone in nature (Group 2)','["Halogens", "Metaloids", "Alkaline Earth Metals", "Noble Gases"]'::jsonb,2,true,'blooket:Periodic Table _ Chemical Reactions CH1.5 _ Blooket.pdf:37' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 1 - Periodic Table'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Chemical Reaction','Chapter 2 Review',25,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Tiny pieces that all matter is made of','["Mass", "Atoms", "Matter", "Cells"]'::jsonb,1,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Object, diagram, or program simplifying understanding','["Map", "Molecules", "Model", "Extended Structures"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Observable characteristic of a substance','["Atoms", "Science theories", "extended structures", "Property"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Relative size of things','["Property", "Siblings", "Molecules", "Scale"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Material made of the same atoms or group of atoms','["Substance", "Molecule", "Conglomerate", "Atoms"]'::jsonb,0,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Process where atoms rearrange to form new substances','["Chemical bonding", "Phase Change", "Burning", "Chemical Reaction"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Starting substance in a chemical reaction','["Reactant", "Ingredient", "Product", "Resultant"]'::jsonb,0,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Ending substance formed during a chemical reaction','["Group of atoms", "Product", "Resultant", "Reactant"]'::jsonb,1,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'To change the order or position of atoms','["Rearrange", "Model", "Change", "Move"]'::jsonb,0,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which does NOT occur during a chemical reaction?','["one or more starting substances (reactants) change into one or more different substances (products).", "atoms do not change from one type to another.", "atoms rearrange to form different groups of atoms.", "products collide to form the reactants"]'::jsonb,3,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During a chemical reaction ______________.','["one or more starting substances change into one or more different substances.", "one or more starting atoms change into one or more different atoms.", "substances combine to form a different substance.", "atoms change from one type to another."]'::jsonb,0,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During a chemical reaction, atoms do not change from one type to another.','["True", "False"]'::jsonb,0,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During a chemical reaction ______________.','["atoms change from one type to another to form the product", "two groups of atoms combine to form the product", "atoms rearrange to form different groups of atoms.", "atoms are destroyed and recreated to form the product"]'::jsonb,2,true,'blooket:Chemical Reactions_ Chapter 2 Review _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 2 Review'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Chemical Reaction','Chapter 3',26,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a process in which atoms rearrange to form new substances','["Scale", "Burning", "Chemical Reaction", "Conservation of Atoms"]'::jsonb,2,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'an ending substance that is made during a chemical reaction','["Resultant", "Group of atoms", "Product", "Reactant"]'::jsonb,2,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a starting substance that is part of a chemical reaction','["Product", "Reactant", "Group of atoms", "Resultant"]'::jsonb,1,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'to change the order or position of something','["Rearrange", "Change", "Move", "Model"]'::jsonb,0,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a type of chemical reaction','["Water vapor to liquid water", "Dissolving sugar in water", "Falling in love", "Burning homework"]'::jsonb,3,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'fuels release ________ when they burn','["more fuel", "smoke", "Energy", "Atoms"]'::jsonb,2,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Atoms are only destroyed when ____________','["reactants are burned", "there is a physical reaction", "pigs fly", "atoms rearrange"]'::jsonb,2,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'During a chemical reaction, atoms will change type to create new substances.','["Only when burned", "False", "True", "Only through a physical reaction"]'::jsonb,1,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens during a chemical reaction','["Atoms are created or destroyed", "Atoms change into other atoms", "substances change phase", "ALL atoms of reactants are used up"]'::jsonb,3,true,'blooket:Chemical Reaction Chapter 3 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Chemical Reaction' and sets.chapter_name='Chapter 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Population & Resources','Chapter 1',29,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why do populations change size in an ecosystem?','["Births and deaths", "Lifespan", "Deaths", "Births"]'::jsonb,0,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'when something becomes different over time','["Change", "Stability", "Indirect effect", "Energy"]'::jsonb,0,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a scientist who studies the interactions of organisms with each other and their envir','["Geologist", "Ecologist", "Ecoterrorist", "Economist"]'::jsonb,1,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'all the living and nonliving things interacting in a particular area','["Ecosystem", "Molecule", "Sample", "Population"]'::jsonb,0,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'living things, such as plants, animals, and bacteria','["Molecules", "Sample", "Population", "Organisms"]'::jsonb,3,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a group of the same type of organism living in the same area','["Chapter Question", "Population", "Sample Representation", "Stability"]'::jsonb,1,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Can a system be stable even as things are being added to and removed from it.','["True", "False"]'::jsonb,0,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'If the number of births and deaths in a given time are equal, then the population size will ____________','["decrease", "go extinct", "increase", "be stable"]'::jsonb,3,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the best way to sample for: "Favorite animal"','["Ask everyone at the park", "Ask every 10th person", "Ask all women", "Ask everyone"]'::jsonb,1,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'when something stays mostly the same over time','["Change", "Indirect effect", "Stability", "Energy"]'::jsonb,2,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a small part that is meant to show what the whole is like','["Population", "Molecules", "Sample", "Organisms"]'::jsonb,2,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'a group of the same type of organism living in the same area','["Sample", "Organisms", "Population", "Molecules"]'::jsonb,2,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'If there are more births than deaths in a given time, then the size of the population _____________.','["increase", "go extinct", "be stable", "decrease"]'::jsonb,0,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'If there are fewer births than deaths, then the size of the population will _________','["decrease", "be stable", "go extinct", "increase"]'::jsonb,0,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What''s the best method for "explaining" or "reasoning"','["Explaing and reasoning", "Key Concepts", "Opinions", "Restate the question in answer form"]'::jsonb,1,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What''s the best method for "explaining" or "reasoning"','["Opinions", "Restate the question in answer form", "Key Concepts", "Explaing and reasoning"]'::jsonb,2,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What''s the best method for "explaining" or "reasoning"','["Restate the question in answer form", "Opinions", "Explaing and reasoning", "Key Concepts"]'::jsonb,3,true,'blooket:Populations and Resources Chapter 1 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Population & Resources','Chapters 2 & 3',30,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What do organisms need in order to reproduce?','["Energy from the sun", "Water from nearby lakes", "Energy released from energy storage molecules", "Shelter from predators"]'::jsonb,2,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is a consumer population?','["A population that eats other populations", "A population that competes with others", "A population that stores energy in molecules", "A population that produces its own energy"]'::jsonb,0,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What causes more births in a population?','["A smaller consumer population", "A decrease in water availability", "A decrease in competition", "An increase in resource population size"]'::jsonb,3,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which of the following would cause more deaths in a resource population?','["A decrease in predators", "A decrease in food", "An increase in its consumer population", "An increase in reproduction"]'::jsonb,2,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the role of energy storage molecules in an ecosystem?','["They act as defense mechanisms", "They allow organisms to release energy for survival and reproduction", "They help build nests for offspring", "They clean toxins from the environment"]'::jsonb,1,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What can affect the size of a population besides its consumer or resource populatio','["Only the size of the moon", "Nothing else affects it", "Other populations that are indirectly connected in the food web", "Temperature changes only"]'::jsonb,2,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens when two populations compete for the same resource?','["A change in one population can affect the other", "They both get more food", "They form a new species", "One of the populations always becomes extinct"]'::jsonb,0,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'How do food webs help scientists understand ecosystems?','["They predict weather patterns", "They show how energy flows in water", "They show eating relationships between populations", "They track animal migration"]'::jsonb,2,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What might cause the moon jelly population to increase besides changes to zoopla sea turtles?','["A decrease in competition from another population", "An increase in rainfall", "A new moon", "A decrease in sunlight"]'::jsonb,0,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why is it important to analyze a representative sample of a population?','["It helps ecologists make accurate claims about the whole population", "It’s faster than analyzing the whole population", "It saves money", "It avoids dealing with predators"]'::jsonb,0,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is the primary role of glucose in an organism''s body?','["To provide structural support", "To aid in reproduction", "To store genetic information", "To release energy needed for survival"]'::jsonb,3,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which of the following best describes a food web?','["A chart depicting population sizes", "A linear sequence showing who eats whom", "A complex network of interconnected food chains", "A diagram showing energy flow in a single direction"]'::jsonb,2,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'How can competition affect population sizes in an ecosystem?','["It has no effect on population sizes", "It can lead to the extinction of all competing species", "It always increases population sizes", "It can limit the growth of populations competing for the same resources"]'::jsonb,3,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is an indirect effect in an ecosystem?','["A direct interaction between two species", "An effect that occurs without any species interaction", "A change in abiotic factors only", "A change in one population that affects another population not directly connected to it"]'::jsonb,3,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why is it important for ecologists to consider different aspects of a sample?','["To make sure the sample represents the whole population accurately", "To ensure the sample is as small as possible", "To avoid collecting unnecessary data", "To focus only on the most abundant species"]'::jsonb,0,true,'blooket:Pop & Resources Ch2&3 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Population & Resources' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Matter & Energy in Ecosystems','Chapter 1',33,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which best describes a system?','["A set of interacting parts forming a complex whole", "A type of molecule", "A source of sunlight", "A single organism"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is an ecosystem?','["A group of planets", "Only living organisms", "Only nonliving things", "All living and nonliving things interacting in an area"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Organisms cannot grow or reproduce without enough what?','["Energy storage molecules", "Oxygen", "Water", "Sunlight"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Producers use sunlight and what else to make energy storage molecules?','["Oxygen", "Rocks", "Nitrogen", "Carbon dioxide"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Carbon dioxide is considered what type of matter?','["Stored energy", "Biotic matter", "Abiotic matter", "Living matter"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Energy storage molecules are considered what type of matter?','["Abiotic matter", "Biotic matter", "Gas matter", "Rock matter"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Photosynthesis moves carbon from what to what?','["Producer to consumer", "Abiotic matter to biotic matter", "Water to oxygen", "Biotic matter to abiotic matter"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What do producers use to make energy storage molecules?','["Animals and sunlight", "Carbon dioxide and sunlight", "Water and soil", "Oxygen and rocks"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Scientists use models to do what?','["Grow plants", "Create sunlight", "Construct and explain ideas", "Destroy evidence"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Science assumes natural systems follow what?','["Random changes", "Consistent patterns", "Magic", "Unknown rules"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What affects the amount of energy storage molecules in ecosystems?','["Animals and water", "Clouds and soil", "Rocks and sand", "Sunlight and carbon dioxide"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'If one part of a system changes, what happens?','["The rest of the system is affected", "Only animals change", "Nothing changes", "Only plants change"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'More carbon dioxide means producers can make what?','["More energy storage molecules", "Less glucose", "More oxygen only", "More rocks"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Less carbon dioxide means producers can make what?','["More plants", "More sunlight", "More energy storage molecules", "Fewer energy storage molecules"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'More sunlight allows producers to make what?','["More animals", "Less carbon", "More energy storage molecules", "Less oxygen"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Less sunlight causes producers to make what?','["Fewer energy storage molecules", "More oxygen", "More carbon", "More glucose"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Reasoning helps scientists connect what?','["Matter and energy", "Claims and sunlight", "Plants and animals", "Evidence and claims"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is an energy storage molecule?','["A molecule organisms use for energy", "A rock used for energy", "A plant structure", "A gas"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Biotic matter includes what?','["Living and dead organisms", "Rocks and soil", "Sunlight", "Air and water"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Abiotic matter includes what?','["Only animals", "Nonliving parts of ecosystems", "Dead organisms", "Plants only"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A producer is an organism that can what?','["Make its own energy storage molecules", "Eat other organisms", "Break rocks", "Only breathe oxygen"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'A consumer gets energy by doing what?','["Eating other organisms", "Making glucose", "Using sunlight", "Absorbing rocks"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Carbon is a type of what?','["Molecule", "Energy", "Cell", "Atom"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Carbon dioxide is made of carbon and what?','["Hydrogen", "Oxygen", "Glucose", "Nitrogen"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Photosynthesis uses sunlight to change carbon dioxide and water into what?','["Rocks and minerals", "Carbon and oxygen", "Energy only", "Oxygen and glucose"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is glucose?','["A producer", "A gas", "An energy storage molecule", "A rock"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which is an example of abiotic matter?','["Dead leaves", "Trees", "Air", "Animals"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:27' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which is an example of biotic matter?','["Sunlight", "Water", "Rocks", "Plants"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:28' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Where does carbon for photosynthesis come from?','["Animals", "Carbon dioxide", "Glucose", "Sunlight"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:29' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What process makes energy storage molecules?','["Evaporation", "Photosynthesis", "Digestion", "Respiration"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:30' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Sunlight provides what during photosynthesis?','["Oxygen", "Energy", "Water", "Carbon"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:31' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What role do producers play in ecosystems?','["They eat producers", "They break rocks", "They remove carbon", "They make energy storage molecules"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:32' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What role do consumers play?','["They create sunlight", "They make glucose", "They create carbon", "They eat to obtain energy"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:33' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'The biodome is an example of what?','["A gas", "An atom", "A molecule", "A system"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:34' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why do populations change size in an ecosystem?','["Only because of water", "Only because of animals", "Changes in available resources and energy", "Only because of sunlight"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:35' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'More sunlight generally causes what?','["Less carbon dioxide", "Less energy", "Less photosynthesis", "More glucose production"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:36' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens when carbon availability decreases?','["Less carbon is available for producers", "Sunlight increases", "Consumers make glucose", "Plants make more glucose"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems Chapter 1 _ Blooket.pdf:37' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapter 1'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;

insert into public.question_sets(unit_name,chapter_name,mission_position,active) values('Matter & Energy in Ecosystems','Chapters 2 & 3',34,true)
on conflict(unit_name,chapter_name) do update set mission_position=excluded.mission_position,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is cellular respiration?','["The process plants use sunlight to make food", "The chemical reaction between oxygen and glucose that releases energy into cells", "The movement of water through plants", "Breathing"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:1' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which organisms give off carbon dioxide to abiotic matter?','["Only producers", "Producers, consumers, and decomposers", "Only consumers", "Only decomposers"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:2' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is produced during cellular respiration?','["Nitrogen", "Carbon dioxide", "Water vapor only", "Oxygen"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:3' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What does cellular respiration move from biotic to abiotic matter?','["Air", "Carbon dioxide", "Carbon", "Energy storage molecules"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:4' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What affects the amount of cellular respiration in an ecosystem?','["Energy from the sun", "The wind speed", "The number of organisms", "Dead matter"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:5' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Does cellular respiration depend on sunlight?','["Only in plants", "Yes, always", "Only during the day", "No, it is not affected by sunlight"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:6' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is an ecosystem?','["Only living things in an area", "A single type of organism", "Only nonliving things in an area", "All the living and nonliving things interacting in an area"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:7' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is abiotic matter?','["Matter that makes up living organisms", "Only dead organisms", "Matter made only of plants", "Matter that makes up nonliving parts of an ecosystem"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:8' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is biotic matter?','["Only rocks and soil", "Only nonliving matter", "Only water and air", "Matter that makes up living and dead organisms"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:9' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is an energy storage molecule?','["A molecule found only in rocks", "A molecule organisms use to release energy they need to survive", "A molecule that blocks sunlight", "A molecule that produces wind"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:10' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is a producer?','["An organism that can make its own energy storage molecules", "An organism that breaks down dead matter to get energy storage molecules", "An organism that needs to eat to get energy storage molecules", "An organism that lives underground"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:11' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is a consumer?','["An organism that produces oxygen", "An organism that needs to eat to get energy storage molecules", "An organism that only eats plants", "An organism that can make its own energy storage molecules"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:12' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is a decomposer?','["An organism that stores carbon dioxide", "An organism that only lives in water", "An organism that can make its own energy storage molecules", "An organism that breaks down dead matter to get energy storage molecules"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:13' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is carbon dioxide?','["An energy storage molecule", "A molecule made of carbon and oxygen atoms", "A kind of plant", "A type of biotic matter"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:14' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is carbon?','["A weather pattern", "A living organism", "A type of atom that makes up molecules such as carbon dioxide", "A type of gas only found underground"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:15' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is photosynthesis?','["The process animals use to breathe", "The process of breaking down dead matter", "The process by which producers use sunlight to make glucose and oxygen", "The movement of carbon into rocks"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:16' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens to the total amount of carbon in a closed ecosystem?','["It remains constant", "It always increases", "It always decreases", "It disappears over time"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:17' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why is Earth considered a closed system?','["Because the amount of carbon stays relatively constant over time", "Because organisms cannot survive", "Because oxygen never changes", "Because no sunlight enters"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:18' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What may form when dead matter is buried underground for a long time?','["Glucose", "Clouds", "Oxygen", "Fossil fuels"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:19' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens when fossil fuels are burned?','["Biotic matter increases", "Creates more carbon in an ecosystem", "More carbon dioxide is added to the atmosphere", "Carbon dioxide is removed from the atmosphere"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:20' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What do photosynthesis and cellular respiration do in ecosystems?','["They remove all oxygen", "They move carbon between abiotic and biotic matter", "Creates more carbon in an ecosystem", "They stop carbon movement"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:21' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'If carbon increases in abiotic matter, what happens to carbon in biotic matter?','["It decreases", "It also increases", "It disappears", "It stays the same"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:22' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'If carbon decreases in abiotic matter, what happens to carbon in biotic matter?','["It stays the same", "It becomes fossil fuel", "It decreases", "It increases"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:23' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is a system?','["A set of interacting parts forming a complex whole", "A single organism", "A type of weather pattern", "A rock cycle"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:24' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Where does the carbon dioxide in abiotic matter come from?','["Cellular respiration", "Energy from the sun", "Photosynthesis", "Energy storage molecules"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:25' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What caused carbon dioxide to decrease in the air of the biodome?','["Carbon dioxide leaked from the biodome", "An increase in photosynthesis", "A decrease in cellular respiration", "It was converted to oxygen"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:26' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happened to the carbon that used to be in the air of the biodome?','["decreased due to cellular respiration", "It was converted to oxygen", "It left the ecosystem", "It went to another part of the ecosystem"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:27' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is a cause?','["A scientific tool", "A type of observation", "WHY something happened", "WHAT happened"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:28' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is an effect?','["A carbon atom", "A type of ecosystem", "WHAT happened", "WHY something happened"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:29' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Can a cause have more than one effect?','["Yes", "No", "Only in experiments", "Only in weather"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:30' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What do science investigations use to make measurements and observations?','["Only rulers", "Only microscopes", "Only computers", "A variety of methods and tools"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:31' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens to carbon during cellular respiration?','["It becomes sunlight", "It moves from abiotic to biotic matter", "It moves from biotic to abiotic matter", "It disappears"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:32' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Which process moves carbon into biotic matter?','["Burning fossil fuels", "Erosion", "Photosynthesis", "Weathering"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:33' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What process releases energy into cells?','["Cellular respiration", "Evaporation", "Decomposition", "Photosynthesis"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:34' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What does connect mean?','["To destroy matter", "To separate things", "To link two or more things", "To increase carbon dioxide"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:35' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What kind of molecule is glucose?','["A carbon atom", "A weather molecule", "An energy storage molecule", "A fossil fuel"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:36' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What is one result of burning fossil fuels?','["Increased carbon dioxide in abiotic matter", "No change to carbon levels", "Decreased carbon dioxide in the atmosphere", "Increased sunlight"]'::jsonb,0,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:37' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Can carbon be produced or used up in a closed ecosystem?','["Only by decomposers", "No, carbon cannot be produced or used up", "Yes, by producers", "Yes, during respiration"]'::jsonb,1,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:38' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'What happens to the amount of carbon in different parts of an ecosystem?','["It never changes", "It only increases", "It can change while the total amount stays constant", "It always disappears"]'::jsonb,2,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:39' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
insert into public.study_questions(set_id,prompt,answers,correct_index,active,source_key)
select sets.set_id,'Why do populations change size in an ecosystem?','["A change in the energy storage molecules available", "Decrease in cellular respiration", "When births are equal to deaths", "Decrease in dead matter"]'::jsonb,3,true,'blooket:Matter & Energy in Ecosystems CH2&3 _ Blooket.pdf:40' from public.question_sets sets
where sets.unit_name='Matter & Energy in Ecosystems' and sets.chapter_name='Chapters 2 & 3'
on conflict(source_key) where source_key is not null do update set set_id=excluded.set_id,prompt=excluded.prompt,answers=excluded.answers,correct_index=excluded.correct_index,active=true;
