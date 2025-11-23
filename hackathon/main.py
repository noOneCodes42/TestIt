from multiprocessing.dummy import Array
import os
from pickletools import optimize
import tempfile
import json
import io
from uuid import UUID
from pyparsing import Opt
from requests import get
from fastapi import FastAPI, File, UploadFile, Response, Request, Cookie, HTTPException, Form, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
import ollama
from supabase import create_client, Client
from pydantic import BaseModel
from datetime import datetime, timedelta
import dotenv
from typing import List
dotenv.load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SECRET_KEY = os.environ.get("SECRET_KEY") # CHANGE THIS TO A SECURE RANDOM STRING IN PRODUCTION
COOKIE_MAX_AGE = int(os.environ.get("COOKIE_MAX_AGE", 604800)) # 7 days

app = FastAPI()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
serializer = URLSafeTimedSerializer(SECRET_KEY)

# Signed Cookie Middleware
class SignedCookieMiddleware(BaseHTTPMiddleware):
    SIGNED_COOKIE_NAMES = ["access_token"]
    
    async def dispatch(self, request: Request, call_next):
        request.state.unsigned_cookies = {}
        
        for cookie_name in self.SIGNED_COOKIE_NAMES:
            signed_value = request.cookies.get(cookie_name)
            if signed_value:
                try:
                    unsigned_value = serializer.loads(signed_value, max_age=COOKIE_MAX_AGE)
                    request.state.unsigned_cookies[cookie_name] = unsigned_value
                except (BadSignature, SignatureExpired) as e:
                    print(f"Cookie verification failed for {cookie_name}: {e}")
                    request.state.unsigned_cookies[cookie_name] = None
        
        return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://front.thetechtitans.vip", "https://api.thetechtitans.vip"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
app.add_middleware(SignedCookieMiddleware)

# Helper functions
def set_signed_cookie(response: Response, key: str, value: str):
    signed_value = serializer.dumps(value)
    
    response.set_cookie(
        key=key,
        value=signed_value,
        httponly=True,
        secure=True, # Set to False if testing on HTTP
        samesite="none", # Important for cross-site cookies
        max_age=COOKIE_MAX_AGE,
        path="/",
        domain=".thetechtitans.vip" # Note the leading dot for subdomains
    )
    print(f"Cookie set: {key} with domain .thetechtitans.vip")

def get_signed_cookie(request: Request, key: str) -> str | None:
    value = request.state.unsigned_cookies.get(key)
    print(f"Getting cookie {key}: {'Found' if value else 'Not found'}")
    return value

def clear_signed_cookie(response: Response, key: str):
    response.delete_cookie(
        key=key, 
        httponly=True, 
        secure=True, 
        samesite="none", 
        path="/", 
        domain="thetechtitans.vip"
    )

# File Processing Helper Functions
def extract_text_from_txt(content: bytes) -> str:
    """Extract text from TXT files with multiple encoding attempts"""
    encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1', 'utf-16']
    
    for encoding in encodings:
        try:
            text = content.decode(encoding)
            print(f"Successfully decoded with {encoding}")
            return text
        except UnicodeDecodeError as e:
            print(f"Failed to decode with {encoding}: {e}")
            continue
    
    raise HTTPException(
        status_code=400, 
        detail="Could not read the text file. Please ensure it uses standard encoding (UTF-8 recommended)."
    )

def extract_text_from_pdf(content: bytes) -> str:
    """Simple PDF text extraction"""
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract_text
        text = pdfminer_extract_text(io.BytesIO(content))
        if text and len(text.strip()) > 10:
            return text.strip()
        else:
            raise Exception("No readable text found in PDF")
    except Exception as e:
        print(f"PDF extraction failed: {e}")
        raise HTTPException(
            status_code=400, 
            detail="PDF text extraction failed. Please upload a text file (.txt) instead, or ensure the PDF contains selectable text (not scanned images)."
        )

def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX files"""
    try:
        import docx
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
            tmp_file.write(content)
            tmp_file.flush()
        
        doc = docx.Document(tmp_file.name)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        # Clean up temp file
        os.unlink(tmp_file.name)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="DOCX file appears to be empty")
            
        return text.strip()
    except ImportError:
        raise HTTPException(status_code=400, detail="DOCX support not available. Please install python-docx: pip install python-docx")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX file: {str(e)}")

def extract_text_from_json(content: bytes) -> str:
    """Extract text from JSON files"""
    try:
        data = json.loads(content.decode('utf-8'))
        # Convert JSON to readable text
        if isinstance(data, dict):
            text_parts = []
            for key, value in data.items():
                text_parts.append(f"{key}: {value}")
            return "\n".join(text_parts)
        elif isinstance(data, list):
            return "\n".join(str(item) for item in data)
        else:
            return str(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading JSON file: {str(e)}")

# Pydantic Models
class SignupBody(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    image_url: str
    pronouns: str

class LoginBody(BaseModel):
    email: str
    password: str

class ClassroomCreate(BaseModel):
    name: str

class JoinClassroomRequest(BaseModel):
    classroom_id: str

# Routes
@app.get("/debug-cookie-flow")
async def debug_cookie_flow(request: Request, response: Response):
    """Comprehensive debug endpoint to test the entire cookie flow"""
    
    # Check what cookies we received
    all_cookies = dict(request.cookies)
    access_token = get_signed_cookie(request, "access_token")
    
    # Set a test cookie to see if it works
    test_token = f"test_token_{datetime.utcnow().timestamp()}"
    set_signed_cookie(response, "access_token", test_token)
    
    # Also set a regular unsigned cookie for comparison
    response.set_cookie(
        key="regular_test_cookie",
        value="regular_cookie_value",
        httponly=False, # Make it accessible to JS for debugging
        secure=True,
        samesite="lax",
        max_age=3600,
        path="/"
    )
    
    return {
        "received_cookies": all_cookies,
        "signed_access_token_found": access_token is not None,
        "signed_access_token_value": access_token,
        "test_cookie_set": test_token,
        "message": "Check your browser DevTools > Application > Cookies to see if cookies are stored"
    }

@app.post("/signup")
async def signup(body: SignupBody, response: Response):
    try:
        auth_response = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password
        })
        user = auth_response.user
        user_id = user.id

        supabase.table("clientProfile").insert({
            "first_name": body.first_name,
            "last_name": body.last_name,
            "image_url": body.image_url,
            "pronouns": body.pronouns,
            "id": user_id
        }).execute()
        
        # Set signed cookie after signup
        if auth_response.session:
            set_signed_cookie(response, "access_token", auth_response.session.access_token)
        
        return {"status": "success", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(body: LoginBody, response: Response):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })
        
        # Set signed cookie after login
        set_signed_cookie(response, "access_token", auth_response.session.access_token)
        print(f"Login successful for {body.email}")
        
        return {
            "status": "success",
            "debug_info": {
                "cookie_set": True,
                "user_id": auth_response.user.id,
                "message": "Check browser cookies in DevTools"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/logout")
async def logout(response: Response):
    clear_signed_cookie(response, "access_token")
    return {"status": "success"}

@app.post("/classroom")
async def create_classroom(
    classroom_data: ClassroomCreate,
    request: Request
):
    access_token = get_signed_cookie(request, "access_token")
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user = supabase.auth.get_user(access_token)
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        teacher_id = user.user.id
        
        # Create classroom
        classroom = supabase.table("classroom").insert({
            "teacher_id": teacher_id,
            "name": classroom_data.name
        }).execute()
        
        classroom_id = classroom.data[0]["id"]
        
        # Add teacher as classroom member with 'teacher' role
        supabase.table("classroom_members").insert({
            "classroom_id": classroom_id,
            "user_id": teacher_id,
            "role": "teacher"
        }).execute()
        
        # Get classroom with teacher profile from clientProfile
        result = supabase.table("classroom")\
        .select("id, name, created_at, teacher_id")\
        .eq("id", classroom_id)\
        .single()\
        .execute()
        
        # Get teacher profile from clientProfile
        teacher_profile = supabase.table("clientProfile")\
        .select("first_name, last_name, image_url, pronouns")\
        .eq("id", teacher_id)\
        .single()\
        .execute()
        
        classroom_data = result.data
        profile_data = teacher_profile.data if teacher_profile.data else {}
        
        return {
            "status": "success",
            "classroom": {
                "id": classroom_data["id"],
                "name": classroom_data["name"],
                "teacher": {
                    "id": teacher_id,
                    "first_name": profile_data.get("first_name"),
                    "last_name": profile_data.get("last_name"),
                    "image_url": profile_data.get("image_url"),
                    "pronouns": profile_data.get("pronouns")
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classroom/join")
async def join_classroom(
    join_request: JoinClassroomRequest,
    request: Request
):
    access_token = get_signed_cookie(request, "access_token")
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user = supabase.auth.get_user(access_token)
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user.user.id
        classroom_id = join_request.classroom_id
        
        # Verify classroom exists and get teacher info
        classroom_result = supabase.table("classroom")\
        .select("id, name, teacher_id")\
        .eq("id", classroom_id)\
        .single()\
        .execute()
        
        if not classroom_result.data:
            raise HTTPException(status_code=404, detail="Classroom not found")
        
        classroom = classroom_result.data
        
        # Get teacher profile from clientProfile
        teacher_profile = supabase.table("clientProfile")\
        .select("first_name, last_name, image_url, pronouns")\
        .eq("id", classroom["teacher_id"])\
        .single()\
        .execute()
        
        # Check if user is already a member
        existing_member = supabase.table("classroom_members")\
        .select("id")\
        .eq("classroom_id", classroom_id)\
        .eq("user_id", user_id)\
        .execute()
        
        if existing_member.data:
            raise HTTPException(status_code=400, detail="You are already a member of this classroom")
        
        # Add user as student member
        supabase.table("classroom_members").insert({
            "classroom_id": classroom_id,
            "user_id": user_id,
            "role": "student"
        }).execute()
        
        teacher_data = teacher_profile.data if teacher_profile.data else {}
        
        return {
            "status": "success",
            "message": "Successfully joined classroom",
            "classroom": {
                "id": classroom_id,
                "name": classroom["name"],
                "teacher": {
                    "id": classroom["teacher_id"],
                    "first_name": teacher_data.get("first_name"),
                    "last_name": teacher_data.get("last_name"),
                    "image_url": teacher_data.get("image_url"),
                    "pronouns": teacher_data.get("pronouns")
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/classrooms")
async def get_my_classrooms(request: Request):
    access_token = get_signed_cookie(request, "access_token")
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user = supabase.auth.get_user(access_token)
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user.user.id
        
        # Get classrooms where user is a member with teacher profiles
        memberships = supabase.table("classroom_members")\
        .select("""
        role, 
        joined_at,
        classroom:classroom_id (
            id, 
            name, 
            created_at, 
            teacher_id
        )
        """)\
        .eq("user_id", user_id)\
        .execute()
        
        classrooms = []
        for membership in memberships.data:
            classroom_data = membership["classroom"]
            
            # Get teacher profile for each classroom
            teacher_profile = supabase.table("clientProfile")\
            .select("first_name, last_name, image_url, pronouns")\
            .eq("id", classroom_data["teacher_id"])\
            .single()\
            .execute()
            
            teacher_data = teacher_profile.data if teacher_profile.data else {}
            
            classrooms.append({
                "id": classroom_data["id"],
                "name": classroom_data["name"],
                "role": membership["role"],
                "joined_at": membership.get("joined_at"),
                "teacher": {
                    "id": classroom_data["teacher_id"],
                    "first_name": teacher_data.get("first_name"),
                    "last_name": teacher_data.get("last_name"),
                    "image_url": teacher_data.get("image_url"),
                    "pronouns": teacher_data.get("pronouns")
                }
            })
        
        return {
            "status": "success",
            "classrooms": classrooms
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/classroom/{classroom_id}")
async def get_classroom_details(classroom_id: str, request: Request):
    access_token = get_signed_cookie(request, "access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user = supabase.auth.get_user(access_token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user.user.id

        # Check membership
        membership = supabase.table("classroom_members")\
        .select("role")\
        .eq("classroom_id", classroom_id)\
        .eq("user_id", user_id)\
        .execute()

        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this classroom")

        your_role = membership.data[0]["role"]

        # Get classroom info
        classroom = supabase.table("classroom")\
        .select("id, name, created_at, teacher_id")\
        .eq("id", classroom_id)\
        .single()\
        .execute()

        # Get teacher profile
        teacher_profile = supabase.table("clientProfile")\
        .select("first_name, last_name, image_url, pronouns")\
        .eq("id", classroom.data["teacher_id"])\
        .single()\
        .execute()

        # GET ALL QUIZZES IN THIS CLASSROOM
        quizzes_result = supabase.table("quizzes")\
        .select("name, is_completed, classroom_id, id, created_at")\
        .eq("classroom_id", classroom_id) \
        .execute()
  
        # print(quizzes_result.data[0])
        # print(classroom_id)
        # Get members
        members_result = supabase.table("classroom_members")\
        .select("role, joined_at, user_id, clientProfile:user_id(first_name, last_name, image_url, pronouns)")\
        .eq("classroom_id", classroom_id)\
        .execute()

        members = []
        for m in members_result.data:
            profile = m.get("clientProfile", {}) or {}
            members.append({
                "user_id": m["user_id"],
                "role": m["role"],
                "joined_at": m["joined_at"],
                "first_name": profile.get("first_name"),
                "last_name": profile.get("last_name"),
                "image_url": profile.get("image_url"),
                "pronouns": profile.get("pronouns")
            })

        teacher_data = teacher_profile.data or {}

        return {
            "status": "success",
            "classroom": {
                "id": classroom.data["id"],
                "name": classroom.data["name"],
                "created_at": classroom.data["created_at"],
                "teacher": {
                    "id": classroom.data["teacher_id"],
                    "first_name": teacher_data.get("first_name"),
                    "last_name": teacher_data.get("last_name"),
                    "image_url": teacher_data.get("image_url"),
                    "pronouns": teacher_data.get("pronouns")
                }
            },
            "quizzes": quizzes_result.data, # This shows all quizzes
            "members": members,
            "your_role": your_role
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/classroom/{classroom_id}/students")
async def get_classroom_students(classroom_id: str, request: Request):
    access_token = get_signed_cookie(request, "access_token")
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user = supabase.auth.get_user(access_token)
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user.user.id
        
        # Verify user is a teacher in this classroom
        membership = supabase.table("classroom_members")\
        .select("role")\
        .eq("classroom_id", classroom_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()
        
        if not membership.data or membership.data["role"] != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can view student list")
        
        # Get all students in this classroom with their profiles
        students_result = supabase.table("classroom_members")\
        .select("""
        joined_at,
        user_id,
        clientProfile:user_id (
            first_name, 
            last_name, 
            image_url, 
            pronouns
        )
        """)\
        .eq("classroom_id", classroom_id)\
        .eq("role", "student")\
        .execute()
        
        students = []
        for student in students_result.data:
            profile_data = student.get("clientProfile", {})
            students.append({
                "user_id": student["user_id"],
                "joined_at": student["joined_at"],
                "first_name": profile_data.get("first_name"),
                "last_name": profile_data.get("last_name"),
                "image_url": profile_data.get("image_url"),
                "pronouns": profile_data.get("pronouns")
            })
        
        return {
            "status": "success",
            "students": students,
            "total_students": len(students)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user")
async def get_user(request: Request):
    access_token = get_signed_cookie(request, "access_token")
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # First, verify the user with Supabase auth
        user = supabase.auth.get_user(access_token)
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get the user's UUID
        user_id = user.user.id
        
        # Now query the clientProfile table using the UUID relation
        profile_response = supabase.table("clientProfile")\
        .select("*")\
        .eq("id", user_id)\
        .execute()
        
        print(f"Profile query for user_id {user_id}: {profile_response}")
        
        if not profile_response.data or len(profile_response.data) == 0:
            # No profile found, return basic user info
            return {
                "status": "success",
                "user": {
                    "id": user.user.id,
                    "email": user.user.email,
                    "created_at": user.user.created_at,
                    "first_name": None,
                    "last_name": None,
                    "image_url": None,
                    "pronouns": None,
                }
            }
        
        # Profile found, return combined data
        profile_data = profile_response.data[0]
        
        return {
            "status": "success",
            "user": {
                "id": user.user.id,
                "email": user.user.email,
                "first_name": profile_data.get("first_name"),
                "last_name": profile_data.get("last_name"),
                "image_url": profile_data.get("image_url"),
                "pronouns": profile_data.get("pronouns"),
                "created_at": user.user.created_at,
            }
        }
        
    except Exception as e:
        print(f"Error in /user endpoint: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@app.get("/classroom/{classroom_id}/quiz/{quiz_id}")
async def fetch_quiz(quiz_id: str, classroom_id: str, request: Request):

    access_token = get_signed_cookie(request, "access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user = supabase.auth.get_user(access_token)
        user_id = user.user.id
        membership = supabase.table("classroom_members").select("role").eq("classroom_id", classroom_id).eq("user_id", user_id).single().execute()

        quizzes_info = supabase.table("quizzes").select("id, name, is_completed, classroom_id").eq("id", quiz_id).eq("classroom_id", classroom_id).single().execute()
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this classroom")
        completed_status = quizzes_info.data["is_completed"]
        user_role = membership.data["role"]
        
        print(f"User role: {user_role}, Quiz completed: {completed_status}, {quiz_id}")

        if user_role == "teacher" or completed_status:
            quiz_info = supabase.table("Q&A").select("question_text, options, correct_answer").eq("quiz_id", quiz_id).execute()
            print(quiz_info.data)
            return quiz_info.data
        
                
                
        else:
            student_quiz_info = supabase.table("Q&A").select("question_text, options").eq("quiz_id", quiz_id).execute()

            return student_quiz_info.data
            

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/results/{quiz_id}/answers/{answer}")
async def submit_quiz_results(quiz_id: str, request: Request, answer: str):
    access_token = get_signed_cookie(request, "access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user = supabase.auth.get_user(access_token)
        user_id = user.user.id
        
        # Convert user answers string to list
        answers_list = answer.split(",")
        
        # Get correct answers from Q&A table (not quizzes table)
        quiz_questions = supabase.table("Q&A")\
            .select("correct_answer")\
            .eq("quiz_id", quiz_id)\
            .execute()
        
        # Extract correct answers into a list
        correct_answers_list = []
        for question in quiz_questions.data:
            # Handle if correct_answer is stored as array or string
            correct_answer = question["correct_answer"]
            if isinstance(correct_answer, list) and len(correct_answer) > 0:
                correct_answers_list.append(correct_answer[0])  # Get first element if it's an array
            else:
                correct_answers_list.append(str(correct_answer).strip())
        
        print(f"User answers: {answers_list}")
        print(f"Correct answers: {correct_answers_list}")
        
        # Calculate score
        score = 0
        total_questions = len(correct_answers_list)
        
        # Check each answer
        for i in range(min(len(answers_list), total_questions)):
            user_answer = answers_list[i].strip().upper()
            correct_answer = correct_answers_list[i].strip().upper()
            
            if user_answer == correct_answer:
                score += 1
                print(f"Question {i+1}: ✓ Correct")
            else:
                print(f"Question {i+1}: ✗ Wrong (User: {user_answer}, Correct: {correct_answer})")
        
        # Calculate percentage
        percentage = (score / total_questions) * 100 if total_questions > 0 else 0
        
        # Save results to database
        result_data = {
            "student_id": user_id,
            "quiz_id": quiz_id,
            "answer": answers_list,
            "score": score
        }
        
        # Insert into quiz_results table (create this table if it doesn't exist)
        supabase.table("quiz-submissions").insert(result_data).execute()
        
        # Mark quiz as completed for this user
        supabase.table("quizzes")\
            .update({"is_completed": True})\
            .eq("id", quiz_id)\
            .execute()
        
        return {
            "status": "success",
            "score": score,
            "answer": answers_list,
            "correct_answers": correct_answers_list
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    
@app.post("/generate-quiz")
async def generate_quiz(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    num_questions: int = Form(...),
    mcq: int = Form(...),
    frq: int = Form(0),
    classroom_id: str = Form(...)
):
    access_token = get_signed_cookie(request, "access_token")

    if not access_token:
        print("No access token found in cookies")
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        # Validate the form data
        if num_questions < 1:
            raise HTTPException(status_code=400, detail="Number of questions must be at least 1")
        
        if mcq < 0 or mcq > num_questions:
            raise HTTPException(status_code=400, detail="MCQ count must be between 0 and total questions")
        print("MCQ count validated")
        # Validate file type
        allowed_extensions = ['.txt', '.pdf', '.docx', '.json']
        file_extension = os.path.splitext(file.filename.lower())[1]
        print("File extension good")
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file_extension} not allowed. Please use: {', '.join(allowed_extensions)}"
            )

        # Read file content
        content = await file.read()
        text_content = ""

        print(f"Processing file: {file.filename}, Size: {len(content)} bytes, Type: {file_extension}")

        # Handle different file types
        if file_extension == '.pdf':
            text_content = extract_text_from_pdf(content)
        elif file_extension == '.docx':
            text_content = extract_text_from_docx(content)
        elif file_extension == '.json':
            text_content = extract_text_from_json(content)
        elif file_extension == '.txt':
            print("Extracting text from TXT file")
            text_content = extract_text_from_txt(content)
        else:
            # Final fallback - try as text
            text_content = extract_text_from_txt(content)

        if not text_content.strip():
            raise HTTPException(status_code=400, detail="No readable text content found in the file")

        print(f"Extracted text length: {len(text_content)} characters")
        print(f"First 200 chars: {text_content[:200]}...")

        # Limit text content to avoid overwhelming the AI
        if len(text_content) > 8000:
            text_content = text_content[:8000] + "... [content truncated]"

        # Ollama prompt
        prompt = f"""
Based on this content, generate exactly {mcq} multiple-choice questions:

{text_content}

Each question must have:
- Clear question text
- 4 options (A, B, C, D)
- One correct answer

Format each question like this:
Q: [question text]
A: [option A]
B: [option B]
C: [option C]
D: [option D]
Correct: [A/B/C/D] LETTER NOT TEXT

Make questions relevant to the content.
"""

        ollama_response = ollama.generate(model="gpt-oss:120b", prompt=prompt)
        raw_text = ollama_response["response"]

        # Parse questions
        questions = []
        for block in raw_text.strip().split("Q:")[1:]:
            lines = [line.strip() for line in block.strip().split("\n") if line.strip()]
            if len(lines) < 6:
                continue
            
            question_text = lines[0]
            options = [
                lines[1].replace("A:", "").strip(),
                lines[2].replace("B:", "").strip(),
                lines[3].replace("C:", "").strip(),
                lines[4].replace("D:", "").strip()
            ]
            correct_letter = lines[5].replace("Correct:", "").strip().upper()
            
            if correct_letter not in {"A", "B", "C", "D"}:
                continue
            
            correct_answer = [correct_letter]
            
            questions.append({
                "question_text": question_text,
                "options": options,
                "correct_answer": correct_answer,
                "type": "mcq"
            })

        if not questions:
            raise HTTPException(status_code=400, detail="No valid questions generated. Please try with different content.")

        # Get user ID from token
        user = supabase.auth.get_user(access_token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user.user.id


        # Create quiz
        quiz_resp = supabase.table("quizzes").insert({
            "user_id": user_id,
            "name": name,
            "classroom_id": classroom_id,
            "is_completed": False
        }).execute()

        quiz_id = quiz_resp.data[0]["id"]

        # Save questions
        quiz_questions = []
        for q in questions:
            q["quiz_id"] = quiz_id
            quiz_questions.append(q)
        
        if quiz_questions:
            supabase.table("Q&A").insert(quiz_questions).execute()

        return {
            "status": "success",
            "quiz_id": quiz_id,
            "classroom_id": classroom_id,
            "questions_generated": len(questions),
            "details": {
                "name": name,
                "total_questions": num_questions,
                "mcq_count": mcq,
                "frq_count": frq,
                "file_processed": file.filename
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# question_text, options, correct_answer

@app.post("/updated-generate-quiz")
async def updated_generate_quiz(question: str, options: list, correct_answer: list, id: str):
    supabase.table("Q&A").update({
        "question_text": question,
        "options": options,
        "correct_answer": correct_answer
    }).eq("quiz_id", id).execute()
    new_results = supabase.table("Q&A").select("question_text, options, correct_answer").eq("quiz_id", id).execute()

    return {
        new_results.data
    }
