import os
from requests import get
from fastapi import FastAPI, File, UploadFile, Response, Request, Cookie, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
import ollama
from supabase import create_client, Client
from pydantic import BaseModel
from datetime import datetime, timedelta
import dotenv
dotenv.load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SECRET_KEY = os.environ.get("SECRET_KEY")  # CHANGE THIS TO A SECURE RANDOM STRING IN PRODUCTION
COOKIE_MAX_AGE = int(os.environ.get("COOKIE_MAX_AGE", 604800))  # 7 days

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
        secure=True,  # Set to False if testing on HTTP
        samesite="none",  # Important for cross-site cookies
        max_age=COOKIE_MAX_AGE,
        path="/",
        domain=".thetechtitans.vip"  # Note the leading dot for subdomains
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


class QuizFormData:
    num_question: int
    name: str
    mcq: int
    frq: int

def get_quiz_form(
    num_question: int = Form(...),
    name: str = Form(...),
    mcq: int = Form(...),
    frq: int = Form(...)
) -> QuizFormData:
    return QuizFormData(num_question=num_question, name=name, mcq=mcq, frq=frq)

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
        httponly=False,  # Make it accessible to JS for debugging
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


class ClassroomCreate(BaseModel):
    name: str

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
    
class JoinClassroomRequest(BaseModel):
    classroom_id: str

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
        
        # Check if user is a member of this classroom
        membership = supabase.table("classroom_members")\
            .select("role")\
            .eq("classroom_id", classroom_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="You are not a member of this classroom")
        
        # Get classroom details
        classroom_result = supabase.table("classroom")\
            .select("id, name, created_at, teacher_id")\
            .eq("id", classroom_id)\
            .single()\
            .execute()
        
        # Get teacher profile
        teacher_profile = supabase.table("clientProfile")\
            .select("first_name, last_name, image_url, pronouns")\
            .eq("id", classroom_result.data["teacher_id"])\
            .single()\
            .execute()
        
        # Get all classroom members with their profiles
        members_result = supabase.table("classroom_members")\
            .select("""
                role, 
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
            .execute()
        
        # Format members data
        members = []
        for member in members_result.data:
            profile_data = member.get("clientProfile", {})
            members.append({
                "user_id": member["user_id"],
                "role": member["role"],
                "joined_at": member["joined_at"],
                "first_name": profile_data.get("first_name"),
                "last_name": profile_data.get("last_name"),
                "image_url": profile_data.get("image_url"),
                "pronouns": profile_data.get("pronouns")
            })
        
        teacher_data = teacher_profile.data if teacher_profile.data else {}
        
        return {
            "status": "success",
            "classroom": {
                "id": classroom_result.data["id"],
                "name": classroom_result.data["name"],
                "created_at": classroom_result.data["created_at"],
                "teacher": {
                    "id": classroom_result.data["teacher_id"],
                    "first_name": teacher_data.get("first_name"),
                    "last_name": teacher_data.get("last_name"),
                    "image_url": teacher_data.get("image_url"),
                    "pronouns": teacher_data.get("pronouns")
                }
            },
            "members": members,
            "your_role": membership.data[0]["role"]
        }
        
    except HTTPException:
        raise
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

async def create_classroom(request: Request):
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
            "teacher_id": teacher_id
        }).execute()
        
        classroom_id = classroom.data[0]["id"]
        
        # Get classroom with teacher profile joined
        result = supabase.table("classroom").select(
            "id, created_at, teacher_id, clientProfile(first_name, last_name, image_url)"
        ).eq("id", classroom_id).single().execute()
        
        data = result.data
        
        return {
            "status": "success",
            "classroom_id": data["id"]
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
@app.post("/logout")
async def logout(response: Response):
    clear_signed_cookie(response, "access_token")
    return {"status": "success"}
@app.post("/generate-quiz")
async def generate_quiz(
    request: Request,
    data: UploadFile = File(...),
    form_data: QuizFormData = Depends(get_quiz_form),
    name: str = Form(...)
):
    access_token = get_signed_cookie(request, "access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        content = await data.read()
        text_content = content.decode("utf-8")
        
        prompt = f"""
You are a question generator. Based on the following content: {text_content}, generate {form_data.mcq} multiple choice questions, each with four answer options and the correct answer identified.

Use the following format for each question:
Q: <question> | A: <option1> | B: <option2> | C: <option3> | D: <option4> | Correct: <option_letter>

- All questions must be directly based on the provided content.
- Always include exactly four answer options (A, B, C, D).
- Only list the correct answer's option letter after 'Correct:'.

Generate clear, concise, and relevant questions and answer options from the source material.
"""
        
        ollama_response = ollama.generate(model="gpt-oss:120b", prompt=prompt)
        ai_response = ollama_response.get("response", "") if isinstance(ollama_response, dict) else str(ollama_response)
        generatedResponse = ollama_response['response']
        questions = generatedResponse.split('Q: ')[1:]  # Skip the first empty element
        parsed_questions = []
        questions_list = [q['question'] for q in parsed_questions]
        answers_list = [q['answers'] for q in parsed_questions]
        correct_answers = [q['correct'] for q in parsed_questions]
        supabase.table("quizzes").insert(name)

        return {"status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))