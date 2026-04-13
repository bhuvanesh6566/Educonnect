from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["ai"])

class StudentInput(BaseModel):
    name: str
    subject: str
    score: int  # 0-100

CURRICULUM = {
    "Mathematics": {
        "beginner":     ["Number Systems", "Basic Algebra", "Fractions & Decimals"],
        "intermediate": ["Quadratic Equations", "Geometry", "Statistics"],
        "advanced":     ["Calculus", "Linear Algebra", "Probability Theory"],
    },
    "Science": {
        "beginner":     ["Matter & Energy", "Basic Biology", "Earth Science"],
        "intermediate": ["Chemistry Reactions", "Physics Motion", "Cell Biology"],
        "advanced":     ["Thermodynamics", "Quantum Basics", "Genetics"],
    },
    "Coding": {
        "beginner":     ["Variables & Loops", "Functions", "Basic Data Structures"],
        "intermediate": ["OOP Concepts", "Recursion", "Sorting Algorithms"],
        "advanced":     ["System Design", "Dynamic Programming", "Distributed Systems"],
    },
    "English": {
        "beginner":     ["Grammar Basics", "Vocabulary Building", "Reading Comprehension"],
        "intermediate": ["Essay Writing", "Literary Analysis", "Advanced Grammar"],
        "advanced":     ["Research Writing", "Rhetoric", "Critical Analysis"],
    },
}

DEFAULT_CURRICULUM = {
    "beginner":     ["Foundational Concepts", "Basic Terminology", "Simple Exercises"],
    "intermediate": ["Core Principles", "Applied Problems", "Case Studies"],
    "advanced":     ["Advanced Theory", "Complex Challenges", "Research Topics"],
}

PRACTICE = {
    "beginner":     ["Solve 10 basic problems daily", "Watch introductory videos", "Take a foundational quiz"],
    "intermediate": ["Attempt 5 mixed problems", "Review past mistakes", "Complete a timed exercise"],
    "advanced":     ["Solve 3 complex problems", "Teach a concept to someone", "Build a mini-project"],
}

def get_level(score: int) -> str:
    if score < 50:
        return "beginner"
    elif score < 75:
        return "intermediate"
    return "advanced"

def get_next_level(level: str) -> str:
    return {"beginner": "intermediate", "intermediate": "advanced", "advanced": "advanced"}[level]

@router.post("/recommend")
def recommend(data: StudentInput):
    level = get_level(data.score)
    next_level = get_next_level(level)
    curriculum = CURRICULUM.get(data.subject, DEFAULT_CURRICULUM)

    topics_to_revise = curriculum.get(level, DEFAULT_CURRICULUM[level])
    next_lessons = curriculum.get(next_level, DEFAULT_CURRICULUM[next_level])
    practice_questions = PRACTICE[level]

    return {
        "name": data.name,
        "subject": data.subject,
        "score": data.score,
        "level": level,
        "topics_to_revise": topics_to_revise,
        "next_lessons": next_lessons,
        "practice_questions": practice_questions,
    }
