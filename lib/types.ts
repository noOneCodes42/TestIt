interface teacher {
    id: string;
    image_url: string;
    pronouns: string;
    created_at: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface questions {
    id: string,
    choices: [{choice: string, answer: boolean}]
}

interface quiz {
    id: string,
    name: string,
    questions: [questions]
}

interface quiz_info {
    id: string,
    name: string,
    is_completed: boolean,
    classroom_id: string;
    created_at: string
}

interface classroom {
    id: string,
    name: string,
    role: string,
    joined_at: string,
    teacher: teacher
}