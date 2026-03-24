export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const postCampaign = async (payload: any) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create campaign");
    }

    return response.json();
};

export const fetchReviews = async () => {
    const response = await fetch(`${API_BASE_URL}/reviews/list`);
    if (!response.ok) throw new Error("Failed to fetch reviews");
    return response.json();
};

export const updateReview = async (reviewId: string, payload: any) => {
    const response = await fetch(`${API_BASE_URL}/reviews/update/${reviewId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update review");
    }

    return response.json();
};

export const fetchDashboardList = async (entity: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/${entity}/list`);
    if (!response.ok) throw new Error(`Failed to fetch ${entity} list`);
    return response.json();
};

export const fetchAnalyticsSummary = async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/analytics/summary`);
    if (!response.ok) throw new Error("Failed to fetch analytics summary");
    return response.json();
};
