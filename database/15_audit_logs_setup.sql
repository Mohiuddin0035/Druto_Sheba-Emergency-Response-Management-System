DROP TABLE IF EXISTS audit_log CASCADE;
CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    operation VARCHAR(20),
    record_id VARCHAR(100),
    changed_by VARCHAR(100) DEFAULT 'system',
    changed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    summary TEXT
);

-- Ambulances Trigger
CREATE OR REPLACE FUNCTION log_ambulance_changes() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
            INSERT INTO audit_log (table_name, operation, record_id, summary)
            VALUES ('ambulances', 'UPDATE', NEW.vehicle_id::text, 'Status changed to ' || NEW.current_status);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, record_id, summary)
        VALUES ('ambulances', 'INSERT', NEW.vehicle_id::text, 'Registered new ambulance ' || NEW.license_plate);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ambulance_audit ON ambulances;
CREATE TRIGGER trg_ambulance_audit AFTER INSERT OR UPDATE ON ambulances FOR EACH ROW EXECUTE FUNCTION log_ambulance_changes();


-- Emergency Requests Trigger
CREATE OR REPLACE FUNCTION log_emergency_changes() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO audit_log (table_name, operation, record_id, summary)
            VALUES ('emergency_requests', 'UPDATE', NEW.request_id::text, 'Request status updated to ' || NEW.status);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, record_id, summary)
        VALUES ('emergency_requests', 'INSERT', NEW.request_id::text, 'New emergency request created');
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_emergency_audit ON emergency_requests;
CREATE TRIGGER trg_emergency_audit AFTER INSERT OR UPDATE ON emergency_requests FOR EACH ROW EXECUTE FUNCTION log_emergency_changes();


-- Pricing Config Trigger
CREATE OR REPLACE FUNCTION log_pricing_changes() RETURNS trigger AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, record_id, summary)
    VALUES ('pricing_config', TG_OP, NEW.config_id::text, 'Pricing and Commissions updated');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pricing_audit ON pricing_config;
CREATE TRIGGER trg_pricing_audit AFTER INSERT OR UPDATE ON pricing_config FOR EACH ROW EXECUTE FUNCTION log_pricing_changes();


-- Staff Users Trigger
CREATE OR REPLACE FUNCTION log_staff_changes() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.role IS DISTINCT FROM NEW.role OR OLD.blocked IS DISTINCT FROM NEW.blocked THEN
            INSERT INTO audit_log (table_name, operation, record_id, summary)
            VALUES ('staff_users', 'UPDATE', NEW.user_id::text, 'Role or Block status updated for ' || NEW.username);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_audit ON staff_users;
CREATE TRIGGER trg_staff_audit AFTER UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION log_staff_changes();
