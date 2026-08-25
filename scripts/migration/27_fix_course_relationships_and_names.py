#!/usr/bin/env python3
"""
27_fix_course_relationships_and_names.py
1. Fixes missing course names for H01C4C, H01D2D, H0N65B, etc.
2. Removes invalid parallel BIRA vs Burgie predecessor links.
3. Fixes inverted predecessor/successor directions.
4. Correctly links H01C4B as predecessor to H04O8A (Wijsbegeerte).
5. Verifies all links on liv.
"""

import subprocess

# 1. Update Course Metadata on liv
update_courses_sql = """
UPDATE course SET name = 'Wijsbegeerte', name_nl = 'Wijsbegeerte', name_en = 'Philosophy', credits = 3, language = 'nl', semesters = '["Semester 1"]'::json WHERE code = 'H01C4C';
UPDATE course SET name = 'Informatieoverdracht en -verwerking', name_nl = 'Informatieoverdracht en -verwerking', name_en = 'Information Transmission and Processing', credits = 4, language = 'nl', semesters = '["Semester 2"]'::json WHERE code = 'H01D2D';
UPDATE course SET name = 'Inleiding tot gegevensbanken', name_nl = 'Inleiding tot gegevensbanken', name_en = 'Introduction to Databases', credits = 3, language = 'nl', semesters = '["Semester 1"]'::json WHERE code = 'H0N65B';
"""

# 2. Clean and correct course_course table on liv
# Remove invalid parallel links
# Correct inverted links:
# - H05B5A (Digitale communicatiesystemen) is NEW, H05A0A (Analyse van digitale communicatie) is OLD -> (source: H05B5A, target: H05A0A)
# - H0E89A (Mobiele netwerken) is NEW, H05S2A (Management van telecom) is OLD -> (source: H0E89A, target: H05S2A)
# - H04O8A (Wijsbegeerte) is NEW, H01C4B (Wijsbegeerte en ethiek) is OLD -> (source: H04O8A, target: H01C4B)

fix_relationships_sql = """
-- Remove invalid parallel course links
DELETE FROM course_course 
WHERE (course_source = (SELECT id FROM course WHERE code = 'H01C4C') AND course_target = (SELECT id FROM course WHERE code = 'H01C4B'))
   OR (course_source = (SELECT id FROM course WHERE code = 'H01D2D') AND course_target = (SELECT id FROM course WHERE code = 'H01D2A'))
   OR (course_source = (SELECT id FROM course WHERE code = 'H0H06A') AND course_target = (SELECT id FROM course WHERE code = 'H08W1A'))
   OR (course_source = (SELECT id FROM course WHERE code = 'H0H51A') AND course_target = (SELECT id FROM course WHERE code = 'H08W3A'));

-- Remove inverted links before re-inserting with correct direction
DELETE FROM course_course
WHERE (course_source = (SELECT id FROM course WHERE code = 'H05A0A') AND course_target = (SELECT id FROM course WHERE code = 'H05B5A'))
   OR (course_source = (SELECT id FROM course WHERE code = 'H0E89A') AND course_target = (SELECT id FROM course WHERE code = 'H05S2A'));

-- Insert correct links (course_source = NEW COURSE, course_target = OLD COURSE)
INSERT INTO course_course (course_source, course_target)
VALUES 
    ((SELECT id FROM course WHERE code = 'H05B5A'), (SELECT id FROM course WHERE code = 'H05A0A')),
    ((SELECT id FROM course WHERE code = 'H0E89A'), (SELECT id FROM course WHERE code = 'H05S2A')),
    ((SELECT id FROM course WHERE code = 'H04O8A'), (SELECT id FROM course WHERE code = 'H01C4B'))
ON CONFLICT DO NOTHING;
"""

print("1. Updating course metadata and correcting relationships on liv...")
cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{update_courses_sql}\n{fix_relationships_sql}\nSQL_EOF'
subprocess.run(cmd, shell=True, capture_output=True, text=True)

# 3. Query all verified relationships
print("\n2. Verified clean course_course relationships on liv:")
verify_sql = """
SELECT 
    c1.code as new_code, 
    c1.name_nl as new_name,
    c2.code as old_code, 
    c2.name_nl as old_name
FROM course_course cc
JOIN course c1 ON cc.course_source = c1.id
JOIN course c2 ON cc.course_target = c2.id
ORDER BY c1.code;
"""
cmd = f'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -c \\"{verify_sql}\\""'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print(res.stdout)
