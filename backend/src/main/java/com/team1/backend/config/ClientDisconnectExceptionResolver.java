package com.team1.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.util.DisconnectedClientHelper;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ClientDisconnectExceptionResolver implements HandlerExceptionResolver {

    private static final DisconnectedClientHelper disconnectedClientHelper =
            new DisconnectedClientHelper(ClientDisconnectExceptionResolver.class.getName());

    @Override
    public ModelAndView resolveException(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception ex
    ) {
        if (disconnectedClientHelper.checkAndLogClientDisconnectedException(ex)) {
            return new ModelAndView();
        }
        return null;
    }
}
