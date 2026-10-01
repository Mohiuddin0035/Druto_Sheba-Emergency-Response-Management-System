-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Trip Feedback & Ratings Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS trip_feedback (
    feedback_id SERIAL PRIMARY KEY,
    trip_id character varying(20) UNIQUE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

GRANT ALL ON TABLE trip_feedback TO anon, authenticated, service_role;
